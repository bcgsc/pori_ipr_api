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
  //process.exit();
}

// Add new column to tables
let addSignOffColumns = () => {
  return new Promise((resolve, reject) => {

    console.log('[MIGRATION][addSignOffColumns]', 'Starting migration');

    db.query('ALTER TABLE pog_analysis_reports_summary_analyst_comments ADD COLUMN "authorSignedAt" timestamp with time zone DEFAULT NULL, ADD COLUMN "authorSignedBy_id" INTEGER DEFAULT NULL, ADD COLUMN "reviewerSignedAt" timestamp with time zone DEFAULT NULL, ADD COLUMN "reviewerSignedBy_id" integer DEFAULT NULL;')
      .then(
        (result) => {
          console.log('[MIGRATION][addSignOffColumns]', 'Success');
          resolve(true)
        },
        (err) => {
          console.log('[MIGRATION][addSignOffColumns]', 'Unable to add columns to comments table', err);
          reject('addSignOffColumns');
        }
      )

  });
};
// Add new column to tables
let addForeignKeyConstraints = () => {
  return new Promise((resolve, reject) => {

    console.log('[MIGRATION][addForeignKeyConstraints]', 'Starting migration');

    db.query('ALTER TABLE pog_analysis_reports_summary_analyst_comments ADD CONSTRAINT "FK_users_authorSignedBy_id" FOREIGN KEY ("authorSignedBy_id") REFERENCES users(id) ON DELETE SET NULL, ADD CONSTRAINT "FK_users_reviewerSignedBy_id" FOREIGN KEY ("reviewerSignedBy_id") REFERENCES users(id) ON DELETE SET NULL;')
      .then(
        (result) => {
          console.log('[MIGRATION][addForeignKeyConstraints]', 'Success');
          resolve(true)
        },
        (err) => {
          console.log('[MIGRATION][addForeignKeyConstraints]', 'Unable to add constraints to comments table', err);
          reject('addSignOffColumns');
        }
      )

  });
};

console.log('[MIGRATION]', 'Starting Migration');

// Start migration chain
addSignOffColumns()
  .then(addForeignKeyConstraints)
  .then((success) => {
    console.log('[MIGRATION]', 'Finished migrations', success);
  })
  .catch((err) => {
    console.log('[MIGRATION]', 'Failed migration', err);
  });