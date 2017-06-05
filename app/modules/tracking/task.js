"use strict";

const _                       = require('lodash');
const moment                  = require('moment');
const db                      = require('../../models/');
const InvalidStateStatus      = require('./exceptions/InvalidStateStatus');
const InvalidTaskDefinition   = require('./exceptions/InvalidTaskDefinition');
const TooManyCheckIns         = require('./exceptions/TooManyCheckIns');
const InvalidTaskOperation    = require('./exceptions/InvalidTaskOperation');
const InvalidCheckInTarget    = require('./exceptions/InvalidCheckInTarget');

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
      'complete'
    ];

    // Existing instance
    if(typeof init === "object" && typeof init.ident === "string") {
      console.log('Existing object');
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
    return new Promise((resolve, result) => {

      // Validate CheckIn
      // TODO: What does this look like?

      // Log outcome into JSON
      if(payload !== null) this.instance.outcome[moment.toISOString()] = payload;

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
        throw new TooManyCheckIns('Too many check ins have occurred for this task', this.instance.checkInsTarget);
      }

      this.instance.save().then(
        (result) => {
          resolve(this.instance);
        },
        (err) => {
          console.log('Failed to update task', err);
          reject({error: {message: 'Query to update task failed'}});
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
  updateCheckIns(target) {

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
   * @param {integer} amount - The amount of check ins to undo
   *
   * @returns {Promise} - Resolves with updated instance
   */
  cancelCheckIn(amount=1) {

    return new Promise((resolve, reject)=> {

      if(typeof amount !== 'number') throw new InvalidTaskOperation('The supplied check in cancellation amount is not a valid integer');

      if((this.instance.checkIns - amount) < 0) throw new InvalidTaskOperation('Attempting to undo an invalid amount of check ins');

      this.instance.checkIns = this.instance.checkIns - amount;
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
    if(!/^[A-z0-9_-]*$/g.test(task.name)) throw new InvalidTaskDefinition('The task name must only contain A-z0-9 and underscores.');

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