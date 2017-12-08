"use strict";

const db          = require(process.cwd() + '/app/models');
const lodash      = require('lodash');
const logger      = process.logger;
const p2s         = require(process.cwd() + '/app/libs/pyToSql');
const _           = require('lodash');


/**
 * Get public version of record
 *
 * @param {string} ident - Germline report uuid ident
 *
 * @returns {Promise}
 */
let getPublic = (ident) => {
  return new Promise((resolve, reject) => {
    
    db.models.germline_small_mutation_review.scope('public').findAll({where: {ident: ident}})
      .then((review) => {
        resolve(review);
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
  
};