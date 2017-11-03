'use strict';

const Sq = require('sequelize');
const db = require(process.cwd() + "/app/models");
const _ = require('lodash');
const summaryLoader = require(process.cwd() + '/app/loaders/summary/mutationSummary');
const logger = require(process.cwd() + '/app/libs/logger');

/**
 * Add columns for tracking report & KB versions
 *
 */

console.log('Loaded dependencies');

let reports = {};

// Make sure we're working on dev
if(db.config.database === 'ipr') {
  console.log('### Can not run this migration on production');
  process.exit();
}

/**
 * Get all legacy mutation summary entries
 *
 * @returns {Promise}
 */
let getAllMutationSummaries = () => {
  return new Promise((resolve, reject) => {
    
    db.models.mutationSummary.findAll()
      .then((results) => {
        console.log('[MIGRATION][getAllComparators]', 'Retrieved All Comparators');
  
        _.forEach(results, (c) => {
          reports[c.pog_report_id] = c;
        });
        
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
 * Loop over all entries and fill in average comparator POG sv percentile
 *
 * @param {object} summaries - The legacy format data row for mutation summaries
 *
 * @returns {object} - The returning object has two nested objects: comparator, average
 */
let updateNewMutationSummary = (summaries) => {
  
  return new Promise((resolve, reject) => {
    
    Promise.all(_.map(summaries, (s) => {
        return db.models.mutationSummaryv2.update({ sv_percentile: s.svPercentilePOG }, {where: {pog_report_id: s.pog_report_id, sv_percentile: null, comparator: 'average' }})
      }))
      .then((result) => {
        console.log('Affected Rows: ' + result.length);
        console.log('[updateNewMutationSummary] Finished updating mutation summary average sv_percentile values');
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
getAllMutationSummaries()
  .then(updateNewMutationSummary)
  .then((success) => {
    console.log('[MIGRATION]', 'Finished migrations', success);
  })
  .catch((err) => {
    console.log('[MIGRATION]', 'Failed migration', err);
  });