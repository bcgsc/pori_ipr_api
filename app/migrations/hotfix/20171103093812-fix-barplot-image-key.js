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
 * Get All Tumour Analysis Comparators
 *
 * @returns {Promise}
 */
let getAllComparators = () => {
  return new Promise((resolve, reject) => {
    
    db.models.tumourAnalysis.findAll()
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
 * Take TA entry and update mutation signature row to include comparator
 *
 * @param {object} comparators - The legacy format data row for mutation summaries
 *
 * @returns {object} - The returning object has two nested objects: comparator, average
 */
let updateComparatorEntry = (comparators) => {
  
  return new Promise((resolve, reject) => {
    
    db.models.imageData.findAll({ where: db.where(db.fn('char_length', db.col('key')), '>',  90), attributes: ['id', 'key', 'filename', 'pog_report_id'] })
      .then((images) => {
        console.log('Entries: ', images.length);
        
        
        Promise.all(_.map(images, (i) => {
            let ta = reports[i.pog_report_id];
            let key = null;
            
            if(ta) {
              switch (i.filename) {
                case 'mutation_summary_sv.png': // Mutation Summary SV density plot
                  key = 'mutation_summary.density_plot_sv.' + ta.diseaseExpressionComparator;
                  break;
                case 'mutation_summary_bar_sv.png': // Mutation Summary SV density plot
                  key = 'mutation_summary.barplot_sv.' + ta.diseaseExpressionComparator;
                  break;
                case 'mutation_summary_snv.png': // Mutation Summary SV density plot
                  key = 'mutation_summary.density_plot_snv.' + ta.diseaseExpressionComparator;
                  break;
                case 'mutation_summary_bar_snv.png': // Mutation Summary SV density plot
                  key = 'mutation_summary.barplot_snv.' + ta.diseaseExpressionComparator;
                  break;
                case 'mutation_summary_indel.png': // Mutation Summary SV density plot
                  key = 'mutation_summary.density_plot_indel.' + ta.diseaseExpressionComparator;
                  break;
                case 'mutation_summary_bar_indel.png': // Mutation Summary SV density plot
                  key = 'mutation_summary.barplot_indel.' + ta.diseaseExpressionComparator;
                  break;
              }
            }
            
            if(!key) {
              console.log(`[${i.id}] No updated key found.`);
              key = i.key;
            } else {
              console.log(`[${i.id}] Updated key set`);
            }
            
            i.key = key;
            
            return i.save();
            
          }))
          .then((result) => {
            console.log('Finished updating results');
            resolve();
          })
          .catch((err) => {
            console.log('Failed to update keys');
            console.log(err);
          });
          
        
      })
      .catch((err) => {
        console.log('Failed to query image data entries');
        console.log(err);
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