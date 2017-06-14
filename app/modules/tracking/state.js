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
      'pending',
      'active',
      'hold',
      'complete'
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

      _.forEach(this.instance.tasks, (t) => {
        if(t.status !== 'complete') stateComplete = false;
      });


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
  }


};