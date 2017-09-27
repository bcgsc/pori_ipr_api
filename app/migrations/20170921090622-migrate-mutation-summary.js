'use strict';

const Sq = require('sequelize');
const db = require("../models");
const _ = require('lodash');
const summaryLoader = require(process.cwd() + '/app/loaders/summary/mutationSummary');
const logger = require(process.cwd() + '/app/libs/logger');

/**
 * Add columns for tracking report & KB versions
 *
 */

console.log('Loaded dependencies');

// Make sure we're working on dev
if(db.config.database !== 'ipr-dev') {
  process.exit();
}

/**
 * Get all legacy format mutation summaries
 *
 * @returns {Promise} - Resolves with array of legacy format mutation summaries
 */
let getAllmutationSummaries = () => {
  return new Promise((resolve, reject) => {
    
    console.log('[MIGRATION][getAllmutationSummaries]', 'Starting migration');
    
    db.models.mutationSummary.findAll()
      .then(reformatMutationSummary)
      .then(addColsToTable)
      .then(addColumnToTumourAnalysis)
      .then(copyMutationSignature)
      .then((result) => {
        resolve(true);
      })
      .catch((err) => {
        console.log('[MIGRATION][getAllmutationSummaries]', 'Migration Failed');
        console.log(err);
        reject(false);
      });
    
  });
};

/**
 * Create new format of tables from old format
 *
 * @param {array} summary - Array of mutation summaries to be reformatted
 *
 * @returns {Promise} - Resolves with array of updated entries
 */
let reformatMutationSummary = (summary) => {
  return new Promise((resolve, reject) => {
    
    let entries = [];
    _.forEach(summary, (s) => {
      
      let report = {
        id: s.pog_report_id,
        ident: 'MIGRATE',
        pog: {
          id: s.pog_id
        }
      };
      
      let result = reformatRow(s);
    
      entries.push(result.comparator, result.average);
      
      console.log('[MIGRATION][reformatMutationSummary]', 'Created new format mutation summary entries');
      resolve(entries);
      
    });
    
  });
};

/**
 * Add columns to the table
 *
 * @param {array} entries - Array of new mutation summary entries
 *
 * @returns {Promise} - Resolves with boolean
 */
let addColsToTable = (entries) => {
  
  return new Promise((resolve, reject) => {
  
    db.models.mutationSummaryv2.bulkCreate(entries)
      .then((result) => {
        resolve(true);
        console.log('[MIGRATION][addColsToTable]', 'Created new mutation summary entries');
      
      })
      .catch((err) => {
        console.log('[MIGRATION][addColsToTable]', 'Failed to create new entries in mutation summary');
        reject(err.message);
      });
  });
};

/**
 * Add mutationSignature column to tumour analysis
 *
 * @returns {Promise}
 */
let addColumnToTumourAnalysis = () => {
  return new Promise((resolve, reject) => {
  
    db.query('ALTER TABLE pog_analysis_reports_summary_tumour_analysis ADD COLUMN "mutationSignature" jsonb DEFAULT \'[]\';')
      .then(() => {
        console.log('[MIGRATION][addColumnToTumourAnalysis]', 'Successfully created new tumour analysis column');
        resolve();
      })
      .catch((err) => {
        console.log('[MIGRATION][addColumnToTumourAnalysis]', 'Failed to create new tumour analysis column');
        console.log(err);
        reject(err.message);
      });
  
  });
};

/**
 * Copy mutation signature data to TumourAnalysis
 *
 * @returns {Promise}
 */
let copyMutationSignature = () => {
  return new Promise((resolve, reject) => {
    
    db.models.mutationSummary.findAll()
      .then((results) => {
        
        Promise.all(_.map(results, (s) => {
          return db.models.tumourAnalysis.update({mutationSignature: s.mutationSignature}, {where: {pog_report_id: s.pog_report_id}});
        }))
          .then((result) => {
            console.log('[MIGRATION][copyMutationSignature]', 'Migrated mutation signature data to tumour analysis');
            resolve(true);
          })
          .catch((err) => {
            console.log('[MIGRATION][copyMutationSignature]', 'Failed to migration mutation signature value');
            console.log(err);
            reject(err.message);
          });
      
      })
      .catch((err) => {
        console.log('[MIGRATION][copyMutationSignature]', 'Failed to retrieve mutation signature values');
        console.log(err);
        reject(err.message);
      });
    
  });
};


/**
 * Convert Legacy Row to Updated Row
 *
 * @param {object} row - The legacy format data row for mutation summaries
 *
 * @returns {object} - The returning object has two nested objects: comparator, average
 */
let reformatRow = (row) => {
  
  // Map entries
  return {
    comparator: {
      comparator: null,
      snv: row['totalSNV'].split(' ')[0],
      snv_truncating: row['totalSNV'].split(' ')[1].replace(/(\[|\])/g, ''),
      indels: row['totalIndel'].split(' ')[0],
      indels_frameshift: row['totalIndel'].split(' ')[1].replace(/(\[|\])/g, ''),
      sv: row['totalSV'].split(' ')[0],
      sv_expressed: row['totalSV'].split(' ')[1].replace(/(\[|\])/g, ''),
      snv_percentile: row['snvPercentileDisease'],
      indel_percentile: row['indelPercentileDisease'],
      sv_percentile: row['svPercentilePOG'],
      pog_id: row.pog_id,
      pog_report_id: row.pog_report_id
    },
    average: {
      comparator: 'average',
      snv: row['totalSNV'].split(' ')[0],
      snv_truncating: row['totalSNV'].split(' ')[1].replace(/(\[|\])/g, ''),
      indels: row['totalIndel'].split(' ')[0],
      indels_frameshift: row['totalIndel'].split(' ')[1].replace(/(\[|\])/g, ''),
      sv: row['totalSV'].split(' ')[0],
      sv_expressed: row['totalSV'].split(' ')[1].replace(/(\[|\])/g, ''),
      snv_percentile: row['snvPercentileTCGA'],
      indel_percentile: row['indelPercentileTCGA'],
      sv_percentile: null,
      pog_id: row.pog_id,
      pog_report_id: row.pog_report_id
    }
  }
  
};

console.log('[MIGRATION]', 'Starting Migration');

// Start migration chain
getAllmutationSummaries()
  .then((success) => {
    console.log('[MIGRATION]', 'Finished migrations', success);
  })
  .catch((err) => {
    console.log('[MIGRATION]', 'Failed migration', err);
  });