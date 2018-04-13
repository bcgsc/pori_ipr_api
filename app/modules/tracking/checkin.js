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
const Task                   = require('./task');

module.exports = class Checkin {

  /**
   * Initialize tracking state task object
   *
   * @param {string|object} init - Pass in either ident string or new object
   * @param {object} options - Options object
   */
  constructor(init, options={}) {
    this.instance = null;
    this.model = db.models.tracking_state_task_checkin;

    this.task = (options.task) ? options.task : null;

    // Existing instance
    if(typeof init === "object" && init !== null && typeof init.ident === "string") {
      this.instance = init;
    }

  }

  /**
   * Create Checkin
   *
   * @params {object} user - The user checking in
   * @params {object} payload - The outcome payload to be stored
   *
   * @returns {Promise} - Resolves with checkin model instance
   */
  createCheckin(task, user, payload) {



    return new Promise((resolve, reject) => {
      let outcome;

      // Check if payload matches set type
      switch(task.outcomeType) {
        case 'date':
          // Valid IOS date
          outcome = moment(payload).toISOString();
          break;
        case 'boolean':
          if(payload === true || payload === false) outcome = payload;
          if(payload === 'true') outcome = true;
          if(payload === 'false') outcome = false;
          break;
        case 'text':
        case 'pass/fail/proceed':
        case 'location':
          outcome = payload;
          break;
      }


      let checkin = {
        task_id: task.id,
        user_id: user.id,
        outcome: payload
      };

      // Create the instance
      this.model.create(checkin).then(
        (result) => {
          this.instance = result;
          resolve(this.instance);
        },
        (err) => {
          console.log('Failed to create checkin', err);
          reject({error: {message: 'Query to create checkin failed: ' + err.message}});
        }
      )

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
          if(!this.instance.outcome[t]) throw new InvalidTaskOperation('Unable to find the outcome to revoke');
          delete this.instance.outcome[t];
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
   * Get public version of this instance
   *
   * @returns {Promise} - Resolves with a public instance of the model
   */
  getPublic() {
    return new Promise((resolve, reject) => {

      this.model.scope('public').findOne({where: {ident: this.instance.ident}}).then(
        (result) => {
          resolve(result);
        },
        (err) => {
          console.log(err);
          reject({error: {message: 'Query failed to find the public instance: ' + err.message}});
        }
      )

    });
  }

};