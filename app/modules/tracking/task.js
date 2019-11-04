'use strict';

const {Op} = require('sequelize');
const db = require('../../models/');
const TooManyCheckIns = require('./exceptions/TooManyCheckIns');
const InvalidTaskOperation = require('./exceptions/InvalidTaskOperation');
const InvalidCheckInTarget = require('./exceptions/InvalidCheckInTarget');
const State = require('./state');
const Checkin = require('./checkin');
const Hook = require('./hook');

const logger = require('../../log');


module.exports = class Task {
  /**
   * Initialize tracking state task object
   *
   * @param {string|object} init - Pass in either ident string or new object
   * @param {object} options - Options object
   */
  constructor(init, options={}) {
    this.instance = null;
    this.model = db.models.tracking_state_task;
    this.allowedStates = [
      'pending',
      'active',
      'hold',
      'complete',
      'failed',
      'cancelled',
    ];

    // Existing instance
    if (typeof init === 'object' && typeof init.ident === 'string') {
      this.instance = init;
    }

    if (init === undefined || this.instance === null) throw new Error('Unable to instantiate State Tracking object');
  }

  /**
   * Create a checkin for this task
   *
   * @param {object} user - The user model instance
   * @param {string|int|boolean} payload - The payload to be placed with the checkin
   * @param {boolean} limitOverride - Over ride the check-in limit?
   * @param {boolean} checkStateComplete - Check if parent state is complete after task is checked in (optional, default: false)
   * @returns {Promise} - Resolves with updated task. Rejects with error object
   */
  checkIn(user, payload = null, limitOverride = false, checkStateComplete = false) {
    return new Promise((resolve, reject) => {
      // Init State wrapper
      const state = new State(this.instance.state);

      // Check for too many checkins
      if ((this.instance.checkins.length + 1) > this.instance.checkInsTarget && !limitOverride) {
        reject({message: `Too many check ins have occurred for this task. Max: ${this.instance.checkInsTarget}, attempted: ${(this.instance.checkins.length + 1)}`, code: 'tooManyCheckins'});
        throw new TooManyCheckIns(`Too many check ins have occurred for this task. Max: ${this.instance.checkInsTarget}, attempted: ${(this.instance.checkins.length + 1)}`);
      }

      // Start chain
      this.createCheckin(user, payload)
        .then(this.checkCompletion.bind(this))
        .then(() => { if (checkStateComplete) return state.checkCompleted(); })
        .then(this.getPublic.bind(this))
        .then(
          (result) => {
            logger.debug(`Checked in task ${this.instance.name}`);
            resolve(result);
          },
          (err) => {
            console.log('Failed to get instance', err);
            const response = {
              message: `Failed to check-in task: ${err.message}`,
              cause: err,
            };
            if (err.code) response.code = err.code;
            reject(response);
          }
        )
        .catch((e) => {
          console.log('Failed to perform checkin', e);
          reject({message: `Failed to perform checkin. Reason: ${e.message}`, cause: e});
        });
    });
  }


  /**
   * Create a new task checkin event
   *
   * @param {object} user - The user model instance
   * @param {string|int|boolean} payload - The payload to be provided in the checkin
   * @returns {Promise} - Resolves with
   */
  createCheckin(user, payload) {
    return new Promise((resolve, reject) => {
      const checkin = new Checkin(null);

      checkin.createCheckin(this.instance, user, payload).then(
        (result) => {
          // Add user to result.
          result.user = user;

          // Add checkin to all checkins
          this.instance.checkins.push(result);
          resolve(result);
        },
        (err) => {
          console.log(err);
          reject({message: `Unable to perform checkin: ${err.error.message}`, cause: err, code: 'failedCreateCheckin'});
        }
      );
    });
  }

  /**
   * Update CheckIns
   *
   * Update the targeted number of check-ins for this task
   *
   * @params {integer} target - The new number of check-in targets for this task
   *
   * @returns {Promise} - Resolves with the current task instance
   */
  updateCheckInsTarget(target) {
    return new Promise((resolve, reject)=> {
      if (typeof target !== 'number') throw new InvalidCheckInTarget('The supplied check in target is not a valid integer');

      this.instance.checkInsTarget = target;
      this.instance.save().then(
        (result) => {
          resolve(this.instance);
        },
        (err) => {
          console.log(err);
          throw new InvalidCheckInTarget('Unable to save the updated target value');
        }
      );
    });
  }

  /**
   * Undo a check in
   *
   * @param {array|string} target - The idents of the check-in to be removed
   * @param {boolean} all - Remove all checkins
   *
   * @returns {Promise} - Resolves with updated instance
   */
  cancelCheckIn(target, all = false) {
    return new Promise((resolve, reject) => {
      if (this.instance.checkIns === 0) throw new InvalidTaskOperation('Attempting to undo an invalid amount of check ins');

      if (typeof target === 'string') target = [target];

      // Build Query
      const opts = {};

      if (!all) opts.where = {ident: {[Op.in]: target}};
      if (all) opts.where = {task_id: this.instance.id};

      db.models.tracking_state_task_checkin.destroy(opts).then(
        (result) => {
          // Change current status based on target
          if (this.instance.checkins.length === 0) this.instance.status = 'pending';
          if (this.instance.checkins.length > 0 && this.instance.checkins.length < this.instance.checkInsTarget) this.instance.status = 'active';

          this.instance.save().then(
            (result) => {
              // Get public version
              this.getPublic().then(
                (task) => {
                  resolve(task);
                },
                (err) => {
                  console.log(err);
                  reject({message: `Failed public lookup for task: ${err.message}`, code: 'failedCheckinRetrieve'});
                }
              );
            },
            (err) => {
              console.log(err);
              throw new InvalidTaskOperation('Unable to save the updated check ins amount');
            }
          );
        },
        (err) => {
          console.log(err);
          reject({message: 'Unable to delete tasks'});
        }
      );
    });
  }

  /**
   * Check Completion
   *
   * @returns {Promise} - Resolves with current instance
   */
  checkCompletion() {
    return new Promise((resolve, reject) => {
      // Get all checkins
      db.models.tracking_state_task_checkin.findAll({where: {task_id: this.instance.id}}).then(
        (checkins) => {
          // Target met!
          if (checkins.length >= this.instance.checkInsTarget) {
            this.instance.status = 'complete';
            this.instance.save()
              // Check if there are any hooks to trigger
              .then(() => {
                return Hook.check_and_invoke(this.instance.state, 'complete', this.instance);
              })
              .then(() => {
                return resolve(this.instance);
              })
              .catch((err) => {
                console.log('Failed to update completed task', err);
                reject({message: 'Unable to update completed task', code: 'failedTaskUpdate'});
              });
          }

          // Target not met yet
          if (checkins.length < this.instance.checkInsTarget) resolve(this.instance);
        },
        (err) => {
          // SQL Error
          console.log('Failed to get checkins', err);
          reject({message: `Failed to retrieve checkins for a task: ${err.message}`});
        }
      );
    });
  }

  /**
   * Validate a task
   *
   * @param task
   * @returns {boolean}
   */
  validateTask(task) {
    // Check task name
    return true;
  }


  /**
   * Update unprotected values
   *
   * @param {object} task - key-value pair object with values to be updated
   */
  setUnprotected(task) {
    if (!this.validateTask(task))
    if (task.name) this.instance.name = task.name;
    if (task.checkInsTarget) this.instance.checkInsTarget = task.checkInsTarget;
    if (task.description) this.instance.description = task.description;
    if (task.status) this.instance.status = task.status;
    if (task.assignedTo_id) this.instance.assignedTo_id = task.assignedTo_id;
  }

  /**
   * Update a task's status with trigger for state status flipping
   *
   * @param {string} status - The state to change the task to
   *
   * @returns {Promise} - Resolves with updated task
   */
  setStatus(status) {
    return new Promise((resolve, reject) => {
      // Check that the provided status is allowed
      if (this.allowedStates.indexOf(status) === -1) throw new Error('The provided status is not allowed');
      this.instance.status = status;
      if (status !== 'pending') {
        // Init State wrapper
        const state = new State(this.instance.state);
        state.setStatus('active', true)
          .then(this.model.update({status: status}, {where: {ident: this.instance.ident}}))
          .then(Hook.check_and_invoke(this.instance.state, status, this.instance))
          .then(state.checkCompleted())
          .then(() => {
            resolve(this.instance);
          })
          .catch((err) => {
            console.log('Failed to update task or state status: ', err.message);
            console.log(err);
          });
      }
    });
  }


  /**
   * Assign the task to new user
   *
   * @param {string|id} user - The user's ident string or row ID
   * @returns {Promise}
   */
  setAsignedTo(user) {
    return new Promise((resolve, reject) => {
      // Check valid ident or id

      const opts = {where: {}};
      if (typeof user === 'number') opts.where.id = user;
      if (typeof user === 'string') opts.where.ident = user;
      if (opts.where === undefined) throw new Error('No valid user identification given (expected id or ident).');

      db.models.user.findOne(opts).then(
        (result) => {
          if (result === null) {
            reject({message: 'Unable to find the specified user'});
            throw new Error('Unable to find the specified user.');
          }

          // Update entry
          this.instance.assignedTo_id = result.id;
          this.instance.save().then(
            (saved) => {
              this.getPublic().then(
                (result) => {
                  resolve(result);
                },
                (err) => {
                  console.log('Failed task query after updating user', err);
                  reject({message: `Unable to get updated task: ${err.message}`, cause: err, code: 'failedRetrieveTask'});
                }
              );
            },
            (err) => {
              console.log(err);
              throw new Error('Query to update task with updated assignee failed.');
            }
          );
        },
        (err) => {
          console.log(err);
          throw new Error('Query to find the specified user failed.');
        }
      );
    });
  }

  /**
   * Get public version of this instance
   *
   * @returns {Promise} - Resolves with a public instance of the model
   */
  getPublic() {
    return new Promise((resolve, reject) => {
      const opts = {};
      opts.where = {ident: this.instance.ident};
      opts.limit = 1;
      opts.order = [['ordinal', 'ASC']];

      opts.attributes = {
        exclude: ['deletedAt'],
      };

      opts.include = [
        {as: 'state', model: db.models.tracking_state.scope('noTasks'), },
        {as: 'assignedTo', model: db.models.user.scope('public')},
        {as: 'checkins', model: db.models.tracking_state_task_checkin, include: [{as: 'user', model: db.models.user.scope('public')}], separate: true},
      ];

      this.model.findOne(opts).then(
        (result) => {
          resolve(result);
        },
        (err) => {
          console.log(err);
          reject({message: `Query failed to find the public instance: ${err.message}`});
        }
      );
    });
  }
};
