'use strict';

const Sq = require('sequelize');
const db = require("../models");
const _ = require('lodash');

/**
 * Add columns for tracking report & KB versions
 *
 */

console.log('Loaded dependencies');

// Make sure we're working on dev
if(db.config.database !== 'ipr-dev') {
  process.exit();
}

// Add new column to tables
let getAllReports = () => {
  return new Promise((resolve, reject) => {
    
    console.log('[MIGRATION][migrateMutationSummaryImages]', 'Starting migration');
    
    db.models.patient_tumour_analysis.findAll()
      .then((results) => {
        
        Promise.all(_.map(results, (ta) => {
          return updateReportMutationSummaryImages(ta);
        }))
          .then()
          .catch();
      
      });
    
  });
};

let updateReportMutationSummaryImages = (ta) => {
  return new Promise((resolve, reject) => {
    
    let opts = {
      where: {
        pog_report_id: ta.pog_report_id,
        key: {
          $in: [
            'mutSummary.barSv',
            'mutSummary.barSnv',
            'mutSummary.barIndel',
            'mutSummary.sv',
            'mutSummary.snv',
            'mutSummary.indel'
          ]
        }
      }
    };
    
    db.models.imageData.findAll(opts)
      .then((images) => {
        
        let promises = [];
        
        // For each image, update to new name with comparator
        Promise.all(_.map(images, (i) => {
          
          let key = 'mutation_summary.';
          
          if(i.key = 'mutSummary.barSv') key += 'barplot_sv';
          if(i.key = 'mutSummary.barSnv') key += 'barplot_snv.' + ta.diseaseExpressionComparator.toLowerCase();
          if(i.key = 'mutSummary.barIndel') key += 'barplot_indel.' + ta.diseaseExpressionComparator.toLowerCase();
          
          if(i.key = 'mutSummary.sv') key += 'density_plot_sv';
          if(i.key = 'mutSummary.snv') key += 'density_plot_snv.' + ta.diseaseExpressionComparator.toLowerCase();
          if(i.key = 'mutSummary.indel') key += 'density_plot_indel.' + ta.diseaseExpressionComparator.toLowerCase();
          
          i.key = key;
          
          return i.save();
        }))
          .then((result) => {
            console.log('[MIGRATION][updateReportMutationSummaryImages] Finished updating images to new format.');
            resolve();
          })
          .catch((err) => {
            console.log('[MIGRATION][updateReportMutationSummaryImages] Failed to update one or more images.');
            console.log(err);
          });
      
      })
      .catch((err) => {
        console.log('[MIGRATION][updateReportMutationSummaryImages]', 'Failed to get images', err);
      });
    
    
  });
};

console.log('[MIGRATION]', 'Starting Migration');

// Start migration chain
getAllReports()
  
  .then((success) => {
    console.log('[MIGRATION]', 'Finished migrations', success);
  })
  .catch((err) => {
    console.log('[MIGRATION]', 'Failed migration', err);
  });