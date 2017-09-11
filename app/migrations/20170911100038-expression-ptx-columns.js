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
let addOutlierPtxCols2 = () => {
  return new Promise((resolve, reject) => {
    
    console.log('[MIGRATION][addOutlierPtxCols2]', 'Starting migration');
    
    db.query('ALTER TABLE pog_analysis_reports_expression_outlier RENAME COLUMN "kIQR" TO "tcgakIQR";' +
      'ALTER TABLE pog_analysis_reports_expression_outlier RENAME COLUMN "kIQRNormal" TO "tcgaNormkIQR";' +
      'ALTER TABLE pog_analysis_reports_expression_outlier ' +
      'ADD COLUMN "tcgaPercCol" character varying DEFAULT null, ' +
      'ADD COLUMN "tcgaAvgPerc" double precision DEFAULT null, ' +
      'ADD COLUMN "tcgaAvgkIQR" double precision DEFAULT null, ' +
      'ADD COLUMN "tcgaAvgQC" double precision DEFAULT null, ' +
      'ADD COLUMN "tcgaAvgQCCol" character varying DEFAULT null, ' +
      'ADD COLUMN "tcgaQCCol" character varying DEFAULT null, ' +
      'ADD COLUMN "ptxPercCol" character varying DEFAULT null, ' +
      'ADD COLUMN "ptxTotSampObs" integer DEFAULT null, ' +
      'ADD COLUMN "ptxPogPerc" double precision DEFAULT null, ' +
      'ADD COLUMN "gtexComp" character varying DEFAULT null, ' +
      'ADD COLUMN "gtexPerc" double precision DEFAULT null, ' +
      'ADD COLUMN "gtexFC" double precision DEFAULT null, ' +
      'ADD COLUMN "gtexkIQR" double precision DEFAULT null, ' +
      'ADD COLUMN "gtexAvgPerc" double precision DEFAULT null, ' +
      'ADD COLUMN "gtexAvgFC" double precision DEFAULT null, ' +
      'ADD COLUMN "gtexAvgkIQR" double precision DEFAULT null, ' +
      'ADD COLUMN "expression_class" character varying DEFAULT null, ' +
      'ADD COLUMN "expType" character varying DEFAULT ' + "'rna';")
      .then(
        (result) => {
          console.log('[MIGRATION][addOutlierPtxCols2]', 'Success');
          resolve(true)
        },
        (err) => {
          console.log('[MIGRATION][addOutlierPtxCols2]', 'Unable to add columns to table', err);
          reject('addOutlierPtxCols2');
        }
      )
    
  });
};

console.log('[MIGRATION]', 'Starting Migration');

// Start migration chain
addOutlierPtxCols2()
  .then((success) => {
    console.log('[MIGRATION]', 'Finished migrations', success);
  })
  .catch((err) => {
    console.log('[MIGRATION]', 'Failed migration', err);
  });