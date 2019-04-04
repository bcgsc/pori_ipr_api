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
let addProjectColumn = () => {
  return new Promise((resolve, reject) => {
    
    console.log('[MIGRATION][addProjectColumn]', 'Starting migration');
    
    db.query('ALTER TABLE "POGs" ADD COLUMN "project" character varying DEFAULT \'POG\'')
      .then(
        (result) => {
          console.log('[MIGRATION][addProjectColumn]', 'Success');
          resolve(true)
        },
        (err) => {
          console.log('[MIGRATION][addProjectColumn]', 'Unable to add columns to table', err);
          reject('addProjectColumn');
        }
      );
  });
};

console.log('[MIGRATION]', 'Starting Migration');

// Start migration chain
addProjectColumn()
  .then((success) => {
    console.log('[MIGRATION]', 'Finished migrations', success);
  })
  .catch((err) => {
    console.log('[MIGRATION]', 'Failed migration', err);
  });