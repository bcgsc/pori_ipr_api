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
let addVersionColumns = () => {
  return new Promise((resolve, reject) => {

    console.log('[MIGRATION][addVersionColumns]', 'Starting migration');

    db.query('ALTER TABLE pog_analysis_reports ADD COLUMN "reportVersion" character varying DEFAULT NULL, ADD COLUMN "kbVersion" character varying DEFAULT NULL;')
      .then(
        (result) => {
          console.log('[MIGRATION][addVersionColumns]', 'Success');
          resolve(true)
        },
        (err) => {
          console.log('[MIGRATION][addVersionColumns]', 'Unable to add columns to comments table', err);
          reject('addSignOffColumns');
        }
      )

  });
};

console.log('[MIGRATION]', 'Starting Migration');

// Start migration chain
addVersionColumns()
  .then((success) => {
    console.log('[MIGRATION]', 'Finished migrations', success);
  })
  .catch((err) => {
    console.log('[MIGRATION]', 'Failed migration', err);
  });