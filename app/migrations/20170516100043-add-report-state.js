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
  //process.exit();
}

// Add new column to tables
let addReportStateColumn = () => {
  return new Promise((resolve, reject) => {

    console.log('[MIGRATION][addReportStateColumn]', 'Starting migration');

    db.query('ALTER TABLE pog_analysis_reports ADD COLUMN "state" character varying DEFAULT \'ready\';')
      .then(
        (result) => {
          console.log('[MIGRATION][addReportStateColumn]', 'Success');
          resolve(true)
        },
        (err) => {
          console.log('[MIGRATION][addReportStateColumn]', 'Unable to add columns to comments table', err);
          reject('addReportStateColumn');
        }
      )

  });
};

console.log('[MIGRATION]', 'Starting Migration');

// Start migration chain
addReportStateColumn()
  .then((success) => {
    console.log('[MIGRATION]', 'Finished migrations', success);
  })
  .catch((err) => {
    console.log('[MIGRATION]', 'Failed migration', err);
  });