'use strict';

const Sq = require('sequelize');
const db = require("../models");
const _ = require('lodash');
const Q = require('q');

/**
 * Add columns for tracking report & KB versions
 *
 */

console.log('Loaded dependencies');

// Make sure we're working on dev
if(db.config.database !== 'ipr-dev') {
  console.log('!!! Running in mode other than development !!!');
  process.exit();
}


// Create Analysis foreign key column on analysis_reports
let renameTable = () => {

  return new Promise((resolve, reject) => {
    console.log('[MIGRATION][renameTable] Starting Migration');

    db.query('ALTER TABLE "POGUsers" RENAME TO pog_analysis_reports_users').then(
      (result) => {
        resolve('success');
      },
      (err) => {
        console.log(err);
        console.log('Unable to rename POGUsers table to pog_analysis_reports_users');
        reject('Unable to rename POGUsers table to pog_analysis_reports_users.');
      }
    )

  });

};

// Get POGs
let addReportColumn = () => {

  return new Promise((resolve, reject) => {
    console.log('[MIGRATION][addReportColumn] Starting Migration');

    db.query('ALTER TABLE pog_analysis_reports_users ADD COLUMN report_id integer, ADD CONSTRAINT "fkey_report_id.pog_analysis_reports_users" FOREIGN KEY (report_id) REFERENCES pog_analysis_reports(id) ON DELETE CASCADE;').then(
      (result) => {
        resolve('success');
      },
      (err) => {
        console.log(err);
        console.log('Unable to to add report column and fkey to user binding table.');
        reject('Unable to to add report column and fkey to user binding table.');
      }
    )

  });
};

// Update records to add report_id
let getAnalysesForReports = () => {
  return new Promise((resolve, reject) => {

    console.log('[MIGRATION][getAnalysesForReports] Starting Migration');
    
    let promises = [];

    db.models.analysis_reports_user.findAll().then(
      (users) => {

        _.forEach(users, (user) => {
          db.models.analysis_report.findOne({where: { pog_id: user.pog_id}}).then(
            (result) => {
              if(result === null) console.log('[MIGRATION][getAnalysesForReports] Failed to find a report for: ', user.id);

              user.report_id = result.id;

              promises.push(user.save());
            },
            (err) => {
              console.log(err);
              console.log('[MIGRATION][getAnalysesForReports] Failed to find report.');
            }
          )
        });

      },
      (err) => {
        console.log(err);
        console.log('[MIGRATION][getAnalysesForReports] Failed to all report users.');
      }
    );


    Promise.all(promises).then(
      (result) => {
        console.log('[MIGRATION][getAnalysesForReports] Finished Migration');
      },
      (err) => {
        console.log(err);
        console.log('[MIGRATION][getAnalysesForReports] Failed migration');
      }
    )


  });
};


console.log('[MIGRATION]', 'Starting Migration');

// Start migration chain
renameTable()
  .then(addReportColumn)
  .then(getAnalysesForReports)
  .then((success) => {
    console.log('[MIGRATION]', 'Finished migrations');
  })
  .catch((err) => {
    console.log('[MIGRATION]', 'Failed migration', err);
  });