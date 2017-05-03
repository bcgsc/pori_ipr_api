"use strict";

const db = require(process.cwd() + "/app/models");

module.exports = class POG {

  /**
   * Construct POG
   *
   * @param POGID
   * @param newPOG
   */
  constructor(POGID, newPOG=false) {
    this.POGID = POGID; // Store POGID
    this.instance = null;
    this.model = db.models.POG;
  }

  /**
   * Retrieve entry from database
   *
   * @returns {promise|object} - Resolves with database instance of model
   */
  retrieve(options) {
    return new Promise((resolve, reject) => {

      // Return cached object
      if(this.instance) resolve(this.instance);

      // Lookup in Database
      this.model.findOne({ where: {POGID: this.POGID } })
        .then((POG) => {

          // Not found, and asked to create
          if(POG === null && options.create) {

            // Run create
            return this.create()
              .then((created) => {
                this.instance = created;
                resolve(this.instance);
              })
              .catch((err) => {
                // Unable to find POG
                console.log('Unable to create POG entry', err);
                reject({message: 'Unable to query database.', status: 500, error: err});
              });
          }

          // POG not found
          if(POG === null) {
            return resolve(null);
          }

          // POG found
          if(POG !== null) {
            this.instance = POG;
            resolve(this.instance);
          }
        })
        .catch((err) => {
          // Unable to find POG
          reject({message: 'Unable to query database.', status: 500, error: err});
        });
    });
  }

  /**
   * Create new entry in database
   *
   * @returns {promise|object} - Promise resolves with new POG. Rejects with error message.
   */
  create() {
    return new Promise((resolve, reject) => {
      this.model.create({POGID: this.POGID})
        .then((POG) => {
          this.instance = POG;
          resolve(POG);
        })
        .catch((err) => {
          // Unable to create POG
          console.log('Failed to create the POG', err);
          reject({message: 'Unable to create POG', status: 500, error: err});
        });
    });
  }

  /**
   * Bind a user to this POG
   *
   * @params {object} user - User DB instance
   * @params {string} role - Role to bind user with
   * @returns {promise|object} - Resolves with binding DB instance
   */
  bindUser(user, role) {
    return new Promise((resolve, reject) => {

    });
  }

  /**
   * Unbind a user from this POG
   *
   * @params {object} user - User DB Instance
   * @param {string} role - Role
   * @returns {promise|boolean} - Resolves with true for success
   */
  unbindUser(user, role) {
    return new Promise((resolve, reject) => {

    });
  }

  /**
   * Get public facing instance
   *
   * @returns {promise|object} - Resolves with a public-safe object
   */
  public() {
    return new Promise((resolve, reject) => {

      if(!this.instance) {

      }

    });
  }

};