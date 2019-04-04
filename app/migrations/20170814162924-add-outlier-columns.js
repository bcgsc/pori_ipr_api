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
let addOutlierPtxCols = () => {
  return new Promise((resolve, reject) => {
    
    console.log('[MIGRATION][addOutlierPtxCols]', 'Starting migration');
    
    db.query('ALTER TABLE pog_analysis_reports_expression_outlier ADD COLUMN "kIQR" double precision DEFAULT null, ' +
      'ADD COLUMN "tcgaQC" double precision DEFAULT null,' +
      'ADD COLUMN "tcgaNormPerc" double precision DEFAULT null,' +
      'ADD COLUMN "kIQRNormal" double precision DEFAULT null,' +
      'ADD COLUMN "ptxPerc" double precision DEFAULT null,' +
      'ADD COLUMN "ptxkIQR" double precision DEFAULT null' +
      ';')
      .then(
        (result) => {
          console.log('[MIGRATION][addOutlierPtxCols]', 'Success');
          resolve(true)
        },
        (err) => {
          console.log('[MIGRATION][addOutlierPtxCols]', 'Unable to add columns to table', err);
          reject('addOutlierPtxCols');
        }
      )
    
  });
};

console.log('[MIGRATION]', 'Starting Migration');

// Start migration chain
addOutlierPtxCols()
  .then((success) => {
    console.log('[MIGRATION]', 'Finished migrations', success);
  })
  .catch((err) => {
    console.log('[MIGRATION]', 'Failed migration', err);
  });