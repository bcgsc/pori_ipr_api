'use strict';

const Sq = require('sequelize');
const db = require("../models");
const _ = require('lodash');

/**
 * Migrate IPR Database to updated structuring
 * Allows for intermediate Report object between POGs and Analysis Reports
 *
 */

console.log('Loaded dependencies');

// Make sure we're working on dev
if(db.config.database !== 'ipr-dev') {
  process.exit();
}

// Add new column to tables
let createTypes = () => {
  return new Promise((resolve, reject) => {

    console.log('[MIGRATION][createTypes]', 'Adding report column');

    let promises = [];

    // Add report type column to genomic events therapeutic and detailed genomic analysis alterations
    promises.push(db.query("CREATE TYPE \"enum_pog_reports_summary_genomic_events_therapeutic_report\" AS ENUM('genomic','probe')"));
    promises.push(db.query("CREATE TYPE \"enum_pog_reports_detailed_dga_report\" AS ENUM('genomic','probe')"));

    Promise.all(promises).then(
      (success) => {
        console.log('[MIGRATION][createTypes]', 'All columns added to table');
        resolve(true); // Send the tables down the line to the next section
      },
      (err) => {
        console.log('[MIGRATION][createTypes]', 'Unable to add column to table', err);
        reject('addReportColumn');
      }
    )
  });
};

// Add new column to tables
let addTypeColumn = () => {
  return new Promise((resolve, reject) => {

    console.log('[MIGRATION][addTypeColumn]', 'Adding report column');

    let promises = [];

    // Add report type column to genomic events therapeutic and detailed genomic analysis alterations
    promises.push(db.query("ALTER TABLE pog_analysis_reports_summary_genomic_events_therapeutic ADD COLUMN \"reportType\" \"enum_pog_reports_summary_genomic_events_therapeutic_report\" DEFAULT 'genomic';"));
    promises.push(db.query("ALTER TABLE pog_analysis_reports_dga_alterations ADD COLUMN \"reportType\" \"enum_pog_reports_detailed_dga_report\" DEFAULT 'genomic';"));

    Promise.all(promises).then(
      (success) => {
        console.log('[MIGRATION][addTypeColumn]', 'All columns added to table');
        resolve(true); // Send the tables down the line to the next section
      },
      (err) => {
        console.log('[MIGRATION][addTypeColumn]', 'Unable to add column to table', err);
        reject('addReportColumn');
      }
    )
  });
};

console.log('[MIGRATION]', 'Starting Migration');

// Start migration chain
createTypes()
  .then(addTypeColumn)
  .then((success) => {
    console.log('[MIGRATION]', 'Finished migrations', success);
  })
  .catch((err) => {
    console.log('[MIGRATION]', 'Failed migration', err);
  });