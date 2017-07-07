"use strict";

const _                       = require('lodash');
const moment                  = require('moment');
const db                      = require('../../models/');
const InvalidStateStatus      = require('./exceptions/InvalidStateStatus');
const FailedCreateQuery       = require('../../models/exceptions/FailedCreateQuery');

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
      'failed'
    ];

    // Existing instance
    if(typeof init === "object" && typeof init.ident === "string") {
      this.instance = init;
    }

    if(init === undefined || this.instance === null) throw new Error('Unable to instantiate State Tracking object');

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

      if(this.instance.startedAt === null && (status === 'active' || status === 'completed')) this.instance.startedAt = moment().toISOString();
      if(this.instance.completedAt === null && status === 'completed') this.instance.completedAt = moment().toISOString();

      // Save or not to save
      if(save) {

        this.instance.save().then(
          (result) => {
            resolve(this.instance);
          })
          .catch((e) => {
            console.log('State status update failed: ', e);
            reject({error: {message: 'Unable to update the tracking state.'}});
          })
      }


      if(!save) {
        resolve(this.instance);
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

      // get Tasks
      db.models.tracking_state_task.findAll({where: {state_id: this.instance.id}}).then(
        (tasks) => {

          _.forEach(tasks, (t) => {
            if(t.status !== 'complete') stateComplete = false;
          });

          if(this.instance.startedAt === null) this.instance.completedAt = moment().toISOString();

          this.instance.save().then(
            (res) => {

              // Current state has completed!
              if(stateComplete) {

                this.instance.status = 'complete';
                this.instance.completedAt = moment().toISOString();

                this.instance.save().then(
                  (result) => {

                    // Find next in line!
                    this.model.findOne({
                      where: {
                        analysis_id: this.instance.analysis_id,
                        ordinal: { $gt: this.instance.ordinal }
                      },
                      order: 'ordinal ASC'
                    }).then(
                      (state) => {
                        // No higher states not yet started!
                        if(state === null) return resolve(null);

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
                            reject({error: {message: 'Unable to set next stage to active due to sql error: ' + err.message}});
                          })
                      })

                  },
                  (err) => {
                    console.log(err);
                    reject({error: {message: 'Unable to update state to completed due to SQL error: ' + err.message}});
                  })

              }

              // State not complete
              if(!stateComplete) {
                resolve(false);
              }


            },
            (err) => {
              console.log('Unable to update state on completion check', err);
              reject({error: {message: 'Failed to update state on checking for completion:' + err.message, cause: err}});
            }
          );

        });
      },
      (err) => {
        console.log('Unable to get state tasks on completion check', err);
        reject({error: {message: 'Failed to retrieve state tasks on checking for completion:' + err.message, cause: err}});
      }
    );

  }

  /**
   * Update unprotected values
   *
   * @param {object} input - key-value pair object with values to be updated
   */
  setUnprotected(input) {
    if(input.name) this.instance.name = input.name;
    if(input.description) this.instance.description = input.description;
  }


  /**
   * Assigns a user to all state tasks
   *
   * @param {string} user - The username or user ident to be assigned
   * @returns {Promise|object} - Resolves with update state instance
   */
  assignUser(user) {
    return new Promise((resolve, reject) => {

      // Find user
      if(typeof user !== 'string') return reject({error: {message: 'user input must be a string'}});

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

          if(userResult === null) return reject({error: {message: 'unable to find the specified user', code: 'userNotFound'}});

          let taskOpts = {
            where: {
              state_id: this.instance.id
            }
          };

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
              reject({error: {message: 'failed to assign user to all state tasks.'}});
              throw new Error('failed to assign user to all state tasks');
            }
          )

        },
        (err) => {
          console.log(err);
          reject({error: {message: 'failed user lookup due to internal problem.'}});
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
          reject({error: {message: 'Unable to get updated state.'}});
          throw new Error('failed to get updated state.');
        }
      );

    });

  }


};