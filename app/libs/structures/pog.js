"use strict";

const db = require(process.cwd() + "/app/models");
const _  = require('lodash');

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
      this.model.findOne({ where: {POGID: this.POGID }, include: {as: 'analysis', model: db.models.pog_analysis }})
        .then((POG) => {

          // Not found, and asked to create
          if(POG === null && options.create) {

            let createOpts = {};
            if(options.nonPOG) {
              createOpts.nonPOG = true;
              createOpts.type = 'genomic';
            }

            // Run create
            return this.create(createOpts)
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
            /*
             // Check if there's any existing analysis:
             if(POG.analysis.length > 0) {
             // Check if we have a match
             if(_.find(POG.analysis, {clinical_biopsy: options.analysis.clinical_biopsy})) {
             // Found by clinical
             }
             if(_.find(POG.analysis, {analysis_biopsy: options.analysis.analysis_biopsy})) {
             // Found by analysis
             }
             }
             */

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
   * @param {object} options? - Optional instructions for creating a new POG entry
   *
   * @returns {promise|object} - Promise resolves with new POG. Rejects with error message.
   */
  create(options={}) {
    return new Promise((resolve, reject) => {

      let data = { POGID: this.POGID };

      // Check for nonPOG flag
      if(options.nonPOG) data.nonPOG = true;

      this.model.create(data)
        .then((POG) => {
          this.instance = POG;

          let analysis = { pog_id: POG.id };

          // Optional Analysis settings that can be passed in
          if(options.analysis && options.analysis.clinical_biopsy) analysis.clinical_biopsy = options.analysis.clinical_biopsy;
          if(options.analysis && options.analysis.analysis_biopsy) analysis.analysis_biopsy = options.analysis.analysis_biopsy;
          if(options.analysis && options.analysis.priority) analysis.priority = options.analysis.priority;
          if(options.analysis && options.analysis.disease) analysis.disease = options.analysis.disease;
          if(options.analysis && options.analysis.biopsy_notes) analysis.biopsy_notes = options.analysis.biopsy_notes;
          if(options.analysis && options.analysis.libraries) analysis.libraries = options.analysis.libraries;
          if(options.analysis && options.analysis.bioapps_source_id) analysis.bioapps_source_id = options.analysis.bioapps_source_id;

          analysis.name = (options.analysis && options.analysis.name) ? options.analysis.name : 'N/A';

          // Create analysis entry
          return db.models.pog_analysis.create(analysis)
            .then((analysis) => {

                POG.analysis = [analysis]; // Nest analysis inside POG
                resolve(POG);
              },
              (error) => {
                console.log('Unable to create pog analysis entry', error);
                reject({message: 'Unable to create pog analysis entry'});
                POG.destroy();
              });
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