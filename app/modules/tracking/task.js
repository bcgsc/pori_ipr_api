"use strict";

const _                       = require('lodash');
const moment                  = require('moment');
const db                      = require('../../models/');
const FailedFindQuery         = require('../../models/exceptions/FailedFindQuery');
const InvalidStateStatus      = require('./exceptions/InvalidStateStatus');
const InvalidTaskDefinition   = require('./exceptions/InvalidTaskDefinition');
const TooManyCheckIns         = require('./exceptions/TooManyCheckIns');
const InvalidTaskOperation    = require('./exceptions/InvalidTaskOperation');
const InvalidCheckInTarget    = require('./exceptions/InvalidCheckInTarget');
const State                   = require('./state');

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
      'failed'
    ];

    // Existing instance
    if(typeof init === "object" && typeof init.ident === "string") {
      this.instance = init;
    }

    if(init === undefined || this.instance === null) throw new Error('Unable to instantiate State Tracking object');

  }

  /**
   * Process task check-in
   *
   * @param {object} payload - Payload response from check-in input
   *
   * @returns {Promise} - Resolves with updated task instance
   */
  checkIn(payload=null) {
    return new Promise((resolve, reject) => {

      // Get state object
      const state = new State(this.instance.state);

      // Validate CheckIn
      if(typeof this.instance.outcome !== 'object' || this.instance.outcome === null) this.instance.outcome = {};

      // Log outcome into JSON
      let outcome = {};
      outcome = {
        type: this.instance.outcomeType,
        value: payload
      };
      
      if (payload !== null) this.instance.outcome[moment().toISOString()] = outcome;

      // Check for completion
      if(this.instance.checkInsTarget === this.instance.checkIns + 1) {
        // This task is complete!
        this.instance.status = 'complete';
      }

      // Check for triggers
      // TODO: Build trigger support

      // Update check-in count
      this.instance.checkIns = this.instance.checkIns + 1;

      if(this.instance.checkIns > this.instance.checkInsTarget) {
        reject({error: {message: 'Too many check ins have occurred for this task. Max: ' + this.instance.checkInsTarget + ' - Attempted: ' + this.instance.checkIns}});
        throw new TooManyCheckIns('Too many check ins have occurred for this task. Max: ' + this.instance.checkInsTarget + ' - Attempted: ' + this.instance.checkIns);
      }

      // Get all other tasks
      this.model.findAll({where: {state_id: this.instance.state_id, ident: {$not: this.instance.ident}}}).then(
        (tasks) => {

          let stateComplete = true;

          _.forEach(tasks, (t) => {
            if(t.status !== 'complete') stateComplete = false;
          });

          this.instance.save().then(
            (result) => {

              state.checkCompleted().then(
                (result) => {
                  resolve(this.instance);
                },
                (err) => {
                  console.log('Failed to check state completion', err);
                  reject({error: {message: 'Failed to check state completion: ' + err.error.message }});
                });
            },
            (err) => {
              console.log('Failed to update task', err);
              reject({error: {message: 'Query to update task failed'}});
            }
          );

        },
        (err) => {
          reject({error: {message: 'Unable to get all sibling tasks to check for state completeness due to SQL error: ' + err.message}});
          console.log(err);
          throw new FailedFindQuery('Failed to lookup task siblings for state completeness check.');
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

      if(typeof target !== 'number') throw new InvalidCheckInTarget('The supplied check in target is not a valid integer');

      this.instance.checkInsTarget = target;
      this.instance.save().then(
        (result) => {
          resolve(this.instance);
        },
        (err) => {
          console.log(err);
          throw new InvalidCheckInTarget('Unable to save the updated target value');
        }
      )
    });
  }

  /**
   * Undo a check in
   *
   * @param {array|string} target - The datestamp of the check-in to be removed
   * @param {boolean} all - Remove all checkins
   *
   * @returns {Promise} - Resolves with updated instance
   */
  cancelCheckIn(target, all=false) {

    return new Promise((resolve, reject)=> {

      if(this.instance.checkIns === 0) throw new InvalidTaskOperation('Attempting to undo an invalid amount of check ins');

      // Removing a single entry
      if(!all) {
        if(typeof target === 'string') target = [target];

        _.forEach(target, (t) => {
          console.log('Attempting to delete', t);
          if(!this.instance.outcome[t]) throw new InvalidTaskOperation('Unable to find the outcome to revoke');
          delete this.instance.outcome[t];
          console.log('Delete result', this.instance.outcome);
        });

        if(Object.keys(this.instance.outcome).length === 0) this.instance.outcome = null;

        this.instance.checkIns = this.instance.checkIns - 1;
      }

      if(all) {
        this.instance.outcome = null;
        this.instance.checkIns = 0;
      }

      // Change current status based on target
      if(this.instance.checkIns === 0) this.instance.status = 'pending';
      if(this.instance.checkIns > 0 && this.instance.checkIns < this.instance.checkInsTarget) this.instance.status = 'active';

      this.instance.save().then(
        (result) => {
          resolve(this.instance);
        },
        (err) => {
          console.log(err);
          throw new InvalidTaskOperation('Unable to save the updated check ins amount');
        }
      )
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

    if(!this.validateTask(task))

    if(task.name) this.instance.name = task.name;
    if(task.description) this.instance.description = task.description;
    if(task.status) this.instance.status = task.status;
    if(task.assignedTo_id) this.instance.assignedTo_id = task.assignedTo_id;
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

      let opts = {};
      if(typeof user === "number") opts.where.id = user;
      if(typeof user === "string") opts.where.ident = user;
      if(opts.where === undefined) throw new Error('No valid user identification given (expected id or ident).');

      db.models.user.findOne(opts).then(
        (result) => {

          if(result === null) throw new Error('Unable to find the specified user.');

          // Update entry
          this.instance.assignedTo_id = result.id;
          this.instance.save().then(
            (saved) => {
              resolve(result);
            },
            (err) => {
              throw new Error('Query to update task with updated assignee failed.');
            });
        },
        (err) => {
          console.log(err);
          throw new Error('Query to find the specified user failed.');
        })
    });
  }


};