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
let addAnalysisColumns = () => {
  return new Promise((resolve, reject) => {
    
    console.log('[MIGRATION][addAnalysisColumns]', 'Starting migration');
    
    db.query('ALTER TABLE pog_analysis ADD COLUMN "onco_panel_submitted" timestamp with time zone DEFAULT null, drop column "biopsyDate"' +
      'ADD COLUMN comparator_disease JSONB DEFAULT \'[]\', ' +
      'ADD COLUMN comparator_normal JSONB DEFAULT \'{"disease_comparator_for_analysis": null, "gtex_comparator_primary_site": null, "normal_comparator_biopsy_site": null, "normal_comparator_primary_site": null}\'' +
      'ADD COLUMN biopsy_site character varying DEFAULT null' +
      'ADD COLUMN biopsy_type character varying DEFAULT null' +
      'ADD COLUMN date_analysis date with timezone DEFAULT null' +
      'ADD COLUMN date_presentation date with timezone DEFAULT null' +
      ';')
      .then(
        (result) => {
          console.log('[MIGRATION][addAnalysisColumns]', 'Success');
          resolve(true)
        },
        (err) => {
          console.log('[MIGRATION][addAnalysisColumns]', 'Unable to add columns to table', err);
          reject('addAnalysisColumns');
        }
      )
    
  });
};

console.log('[MIGRATION]', 'Starting Migration');

// Start migration chain
addAnalysisColumns()
  .then((success) => {
    console.log('[MIGRATION]', 'Finished migrations', success);
  })
  .catch((err) => {
    console.log('[MIGRATION]', 'Failed migration', err);
  });