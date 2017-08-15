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

    db.query('ALTER TABLE "POGDataHistories" RENAME TO pog_analysis_reports_histories').then(
      (result) => {
        resolve('success');
      },
      (err) => {
        console.log(err);
        console.log('Unable to rename POGDataHistories table to pog_analysis_reports_histories');
        reject('Unable to rename POGDataHistories table to pog_analysis_reports_histories.');
      }
    )

  });

};

// Get POGs
let addReportColumn = () => {

  return new Promise((resolve, reject) => {
    console.log('[MIGRATION][addReportColumn] Starting Migration');

    db.query('ALTER TABLE pog_analysis_reports_histories ADD COLUMN pog_report_id integer, ADD CONSTRAINT "fkey_pog_report_id.pog_analysis_reports_histories" FOREIGN KEY (pog_report_id) REFERENCES pog_analysis_reports(id) ON DELETE CASCADE;').then(
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

    db.models.pog_analysis_reports_history.findAll().then(
      (history) => {

        _.forEach(history, (user) => {
          db.models.analysis_report.findOne({where: { pog_id: history.pog_id}, order: [['createdAt', 'DESC']]}).then(
            (result) => {
              if(result === null) return console.log('[MIGRATION][getAnalysesForReports] Failed to find a report for: ', user.id);

              history.report_id = result.id;
              promises.push(history.save());
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