"use strict";

const _                       = require('lodash');
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
      console.log('Existing object');
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
   * Update unprotected values
   *
   * @param {object} input - key-value pair object with values to be updated
   */
  setUnprotected(input) {
    if(input.name) this.instance.name = input.name;
    if(input.description) this.instance.description = input.description;
  }


};