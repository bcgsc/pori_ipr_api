"use strict";

const db          = require(process.cwd() + '/app/models');
const lodash      = require('lodash');
const logger      = require('../../../lib/log');
const p2s         = require(process.cwd() + '/app/libs/pyToSql');
const _           = require('lodash');


/**
 * Retrieve user entries
 *
 * Supporting function
 *
 * @param users
 */
let getUpdateUsers = (users) => {
  return new Promise((resolve, reject) => {
    
    if(users.length === 0) resolve([]);
    
    db.models.user.findAll({where: { ident: {$in: users}}})
      .then((u) => {
        resolve(u);
      })
      .catch((e) => {
        reject({message: 'Failed query to find requested users'});
        logger.error('Failed to query users table to find update users', e);
      });
    
  });
};


/**
 * Updates an existing report with supplied values
 *
 * @param {object} report - The model instance of an existing report
 * @param {object} data - Key-value paired object of values to be updated
 *
 * @returns {Promise/object} - Resolves with updated model object
 */
let updateReport =  (report, data) => {
  return new Promise((resolve, reject) => {
    
    let updateData = {};
    let resolveUsers = {};
    
    updateData.exported = data.exported;
    
    // Supported values to update
    if(data.biofx_assigned) resolveUsers.biofx = data.biofx_assigned;
    
    getUpdateUsers(_.values(resolveUsers))
    // Process update users
      .then((users) => {
        if(users.length > 0) {
          if(_.find(users, {ident: data.biofx_assigned})) updateData.biofx_assigned_id = _.find(users, {ident: data.biofx_assigned}).id;
        }
        
        return report.update(updateData);
      })
      .then((r) => {
        resolve(r);
      })
      .catch((e) => {
        reject({message: `Unable to update the supplied report: ${e.message}`});
        logger.error('Unable to update the supplied report', e);
      });
    
  });
};


/**
 * Get public version of record
 *
 * @param {string} ident - Germline report uuid ident
 *
 * @returns {Promise}
 */
let getPublic = (ident) => {
  return new Promise((resolve, reject) => {
    
    db.models.germline_small_mutation.scope('public').findAll({where: {ident: ident}})
      .then((patient) => {
        resolve(patient);
      })
      .catch((e) => {
        reject({message: `Failed to retrieve public scope of germline report: ${e.message}`});
        logger.error('Failed to retrieve public version of germline report', e);
      });
    
  });
};

// Pseudo Interface
module.exports = {
  
  // Get public version of report
  public: getPublic,
  
  // Update report
  updateReport: updateReport,
  
  // Get updated users
  getUpdateUsers: getUpdateUsers
  
};