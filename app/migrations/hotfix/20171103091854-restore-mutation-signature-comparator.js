'use strict';

const {Op} = require('sequelize');
const db = require(process.cwd() + "/app/models");
const _ = require('lodash');
const summaryLoader = require(process.cwd() + '/app/loaders/summary/mutationSummary');
const logger = require(process.cwd() + '/app/libs/logger');

/**
 * Add columns for tracking report & KB versions
 *
 */

console.log('Loaded dependencies');

// Make sure we're working on dev
if(db.config.database === 'ipr') {
  console.log('### Can not run this migration on production');
  process.exit();
}

/**
 * Get All Tumour Analysis Comparators
 *
 * @returns {Promise}
 */
let getAllComparators = () => {
  return new Promise((resolve, reject) => {
    
    db.models.tumourAnalysis.findAll()
      .then((results) => {
        console.log('[MIGRATION][getAllComparators]', 'Retrieved All Comparators');
        resolve(results);
      })
      .catch((err) => {
        console.log('[MIGRATION][copyMutationSignature]', 'Failed to retrieve mutation signature values');
        console.log(err);
        reject(err.message);
      });
    
  });
};


/**
 * Take TA entry and update mutation signature row to include comparator
 *
 * @param {object} comparators - The legacy format data row for mutation summaries
 *
 * @returns {object} - The returning object has two nested objects: comparator, average
 */
let updateComparatorEntry = (comparators) => {
  
  return new Promise((resolve, reject) => {
    
    Promise.all(_.map(comparators, (comp) => {
        return db.models.mutationSummaryv2.update({ comparator: comp.diseaseExpressionComparator }, {where: {pog_report_id: comp.pog_report_id, comparator: null, sv_percentile: {[Op.ne]: null}}});
      }))
      .then((result) => {
        console.log('Affected Rows: ' + result.length);
        resolve(true);
      })
      .catch((err) => {
        console.log('error', err);
        reject();
      })
    
  });
  
};

console.log('[MIGRATION]', 'Starting Migration');

// Start migration chain
getAllComparators()
  .then(updateComparatorEntry)
  .then((success) => {
    console.log('[MIGRATION]', 'Finished migrations', success);
  })
  .catch((err) => {
    console.log('[MIGRATION]', 'Failed migration', err);
  });