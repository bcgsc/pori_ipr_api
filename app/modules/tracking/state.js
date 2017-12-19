"use strict";

const _                       = require('lodash');
const moment                  = require('moment');
const db                      = require('../../models/');
const InvalidStateStatus      = require('./exceptions/InvalidStateStatus');
const FailedCreateQuery       = require('../../models/exceptions/FailedCreateQuery');
const logger                  = require(process.cwd() + '/lib/log');
const Hook                    = require('./hook');

module.exports = class State {

  /**
   * Initialize tracking state object
   *
   * @param {string|object} init - Pass in either ident string or new object
   * @param {object} options - Options object
   */
  constructor(init, options={}) {
    this.instance = null;
    this.model = db.models.tracking_state;
    this.allowedStates = [
      'active',
      'pending',
      'complete',
      'hold',
      'failed',
      'cancelled'
    ];

    // Existing instance
    if(typeof init === "object" && typeof init.ident === "string") {
      this.instance = init;
    }

    if(init === undefined || this.instance === null) throw new Error('Unable to instantiate State Tracking object');

  }

  /**
   * Update all possible settings
   *
   * @param {object} update - Key-value pair of items to be updated
   * @returns {Promise} - Resolves with updated instance
   */
  updateAll(update) {

    return new Promise((resolve, reject) => {

      this.assignUser((update.assignedTo !== undefined && update.assignedTo !== null) ? update.assignedTo : null).then(
        (assignRes) => {

          this.setUnprotected(update);
          this.setStatus(update.status)
            .then(() => {
              return this.instance.save();
            })
            .then(this.getPublic.bind(this))
            .then((pub) => {
              resolve(pub);
            })
            .catch((err) => {
              reject({message: 'Unable to update the public version of state: ' + err.message});
            });
        },
        (err) => {
          reject({message: 'Unable to assign user to all tasks: ' + err.message});
        }
      );

    });

  }


  /**
   * Set the status of a state
   *
   * @param {string} status - The updated status to assign to the state
   * @param {boolean} save - Save the change in this call
   * @returns {Promise}
   */
  setStatus(status, save=false) {
    return new Promise((resolve, reject) => {

      // Validate status
      if(this.allowedStates.indexOf(status) === -1) {
        reject({error: {message: 'The provided status is not vailid'}});
        throw new InvalidStateStatus('The provided status is not valid');
      }

      // Update State Status
      this.instance.status = status;
      
      logger.debug('Setting status of', this.instance.status);
      
      if(this.instance.startedAt === null && (status === 'active' || status === 'completed')) this.instance.startedAt = moment().toISOString();
      if(this.instance.completedAt === null && status === 'completed') this.instance.completedAt = moment().toISOString();

      // Save or not to save
      if(save) {

        this.instance.save()
          // Check for hooks
          .then(Hook.check_and_invoke(this.instance.slug, status))
          .then(() => {
            resolve(this.instance);
          })
          .catch((e) => {
            console.log('State status update failed: ', e);
            reject({error: {message: 'Unable to update the tracking state.'}});
          })
      }


      if(!save) {

      Hook.check_hook(this.instance.slug, status)
        .then((hooks) => {
          if(hooks.length > 0) {
            return Promise.all(_.map(hooks, (h) => {
              return Hook.invoke_hook(h, this.instance);
            }));
          }
          if(hooks.length === 0) return Promise.resolve([]);
        })
        .then(() => {
          resolve(this.instance);
        })
        .catch((e) => {
          reject({message: 'Failed to check for and execute hooks'});
          console.log(e);
        });
      }

    });

  }

  /**
   * Check if a state has completed all tasks
   *
   */
  checkCompleted() {

    return new Promise((resolve, reject) => {
      
      let stateComplete = true;
      this.instance.status = 'active';
    
      logger.debug('[state]', 'Starting Check Completed');
  
      // get Tasks
      db.models.tracking_state_task.findAll({where: {state_id: this.instance.id}}).then(
        (tasks) => {
          
          _.forEach(tasks, (t) => {
            if(t.status !== 'complete') stateComplete = false;
          });

          if(this.instance.startedAt === null) {
            this.instance.startedAt = moment().toISOString();
          }
          
          if(stateComplete) {
            this.instance.completedAt = moment().toISOString();
            this.instance.status = 'complete';
          }
          
          _.forEach(tasks, (t, i) => {
            tasks[i] = t.toJSON();
          });
          
          logger.debug('[state]', 'Checking if state is complete', stateComplete);
          
          this.instance.save().then(
            (result) => {
              
              // Current state has completed!
              if(stateComplete) {
                
                logger.debug('[state]', 'Marking state as complete');
                
                // Check For Hooks
                Hook.check_hook(this.instance.slug, 'complete', null)
                  .then((hooks) => {
                    if(hooks.length > 0) {
                      return Promise.all(_.map(hooks, (h) => {
                        return Hook.invoke_hook(h, this.instance);
                      }));
                    }
                    if(hooks.length === 0) return Promise.resolve([]);
                  })
                  .then(this.findNextState.bind(this))
                  .then(this.startNextState.bind(this))
                  .then(() => {
                    // State updated to complete
                    resolve(true);
                  })
                  .catch((err) => {
                    console.log('Failed to check hooks or next states');
                    reject({message: 'Failed to check hooks or invoke next state'});
                  });
                
              }
              
              // State not complete
              if(!stateComplete) {
                logger.debug('[state]', 'State not complete');
                resolve(false);
              }
  
            },
            (err) => {
              console.log(err);
              reject({error: {message: 'Unable to update state to completed due to SQL error: ' + err.message}});
            });
          
        });
      },
      (err) => {
        console.log('Unable to get state tasks on completion check', err);
        reject({error: {message: 'Failed to retrieve state tasks on checking for completion:' + err.message, cause: err}});
      }
    );

  }
  
  /**
   * Find the next state in line
   *
   * @returns {Promise|object|null} - Resolves with state model object
   */
  findNextState() {
    return this.model.findOne({
      where: {
        analysis_id: this.instance.analysis_id,
        ordinal: { $gt: this.instance.ordinal }
      },
      order: 'ordinal ASC'
    });
  }
  
  /**
   * Start next State in Line
   *
   * Takes in the next state model object and triggers the "active" status on it.
   *
   * @param {object} state
   * @returns {Promise}
   */
  startNextState(state) {
    return new Promise((resolve, reject) => {
      if(state === null) return resolve(); // Not a state/none found
  
      // Adjacent state already started or held
      if(state.status === 'complete' || state.status === 'hold') return resolve(null);
  
      state.status = 'active';
      state.startedAt = moment().toISOString();
  
      // Started next stage, save change to DB
      state.save().then(
        (result) => {
          resolve(state);
        },
        (err) => {
          console.log(err);
          reject({message: 'Unable to set next stage to active due to sql error: ' + err.message});
        })
      
    });
  }

  /**
   * Update unprotected values
   *
   * @param {object} input - key-value pair object with values to be updated
   */
  setUnprotected(input) {

    if(input.name) this.instance.name = input.name;
    if(input.description) this.instance.description = input.description;
    if(input.completedAt) this.instance.completedAt = input.completedAt;
    if(input.startedAt) this.instance.startedAt = input.startedAt;
    if(input.jira) this.instance.jira = input.jira;
  }


  /**
   * Assigns a user to all state tasks
   *
   * @param {string|null} user - The username or user ident to be assigned
   * @returns {Promise|object} - Resolves with update state instance
   */
  assignUser(user) {
    return new Promise((resolve, reject) => {

      // Check for null first
      if(user === null) return resolve(this.instance);

      // Check for passed object
      if(typeof user === 'object' && user.ident) user = user.ident;

      // Find user
      if(typeof user !== 'string') return reject({message: 'user input must be a string'});

      // Lookup user
      let userOpts = {where: {}};

      if(user.match(/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/)) {
        userOpts.where.ident = user;
      } else {
        userOpts.where.username = user;
      }

      // Lookup User
      db.models.user.findOne(userOpts).then(
        (userResult) => {

          if(userResult === null) return reject({message: 'unable to find the specified user', code: 'userNotFound'});

          if(userResult.id === this.instance.assignedTo_id) return resolve(this.instance);

          let taskOpts = {
            where: {
              state_id: this.instance.id
            }
          };

          this.instance.assignedTo_id = userResult.id;

          // Update tasks with new assigneee
          db.models.tracking_state_task.update({assignedTo_id: userResult.id}, taskOpts).then(
            (result) => {

              // Retrieve public version of this state
              this.getPublic().then(
                (result) => {
                  resolve(result);
                },
                (err) => {
                  reject(err);
                }
              )


            },
            (err) => {
              console.log(err);
              reject({message: 'failed to assign user to all state tasks.'});
              throw new Error('failed to assign user to all state tasks');
            }
          )

        },
        (err) => {
          console.log(err);
          reject({message: 'failed user lookup due to internal problem.'});
          throw new Error('Unable to query for users when assigning all state tasks');
        }
      );

    });
  }

  /**
   * Get full public version of this instance
   *
   * @returns {Promise}
   */
  getPublic() {
    return new Promise((resolve, reject) => {

      let opts = {
        where: {
          ident: this.instance.ident,
        },
        attributes: {
          exclude: ['deletedAt']
        },
        include: [
          {as: 'analysis', model: db.models.pog_analysis.scope('public')},
          {
            as: 'tasks',
            model: db.models.tracking_state_task,
            attributes: {exclude: ['id', 'state_id', 'assignedTo_id']},
            order: [['ordinal', 'ASC']],
            include: [
              {as: 'assignedTo', model: db.models.user.scope('public')},
              {
                as: 'checkins',
                model: db.models.tracking_state_task_checkin,
                include: [{as: 'user', model: db.models.user.scope('public')}],
              }
            ]
          }
        ]
      };

      // Get updated public state with nested tasks
      this.model.scope('public').findOne(opts).then(
        (state) => {
          resolve(state);
        },
        (err) => {
          console.log(err);
          reject({message: 'Unable to get updated state.'});
          throw new Error('failed to get updated state.');
        }
      );

    });

  }


};