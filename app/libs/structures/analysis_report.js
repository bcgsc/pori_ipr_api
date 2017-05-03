"use strict";

const db = require(process.cwd() + "/app/models");
const _ = require('lodash');

module.exports = class analysis_report {

  /**
   * Construct Report
   *
   * @param {string} ident - identification string
   */
  constructor(ident=null) {
    this.ident = ident; // Store POGID
    this.instance = null;
    this.model = db.models.analysis_report;
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
      this.model.findOne({ where: {ident: this.ident }, include: {model: db.models.pog, as: 'pog'} })
        .then((report) => {

          // POG not found
          if(report === null) {
            return resolve(null);
          }

          // POG found
          if(report !== null) {
            this.instance = report;
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
   * @returns {promise|object} - Promise resolves with new POG Analysis Report. Rejects with error message.
   */
  create(pog, user, type) {
    return new Promise((resolve, reject) => {
      this.model.create({ ident: this.makeReportIdent(), createdBy_id: user.id, type: type, pog_id: pog.id })
        .then((report) => {
          this.instance = report;
          this.ident = report.ident;
          resolve(report);
        })
        .catch((err) => {
          // Unable to create POG
          console.log('Failed to create the POG Analysis Report', err);
          reject({message: 'Unable to create POG Analysis Report', status: 500, error: err});
        });
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

  /**
   * Create ident string
   *
   * @returns {string}
   */
  makeReportIdent() {
    let ident = "";
    let chars = "ABCDEFGHIJKLMNOPQRSTUVQXYZ0123456789";

    for(let i=0; i < 5; i++) {
      ident += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return ident;
  };


};