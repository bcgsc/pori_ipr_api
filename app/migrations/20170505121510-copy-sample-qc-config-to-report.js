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
let getPOGsAndReports = () => {
  return new Promise((resolve, reject) => {

    console.log('[MIGRATION][getPOGsAndReports]', 'Getting POGs & Reports');

    db.models.analysis_report.findAll({include: [{model: db.models.POG, as: 'pog'}]}).then(
      (reports) => {
        resolve(reports);
      },
      (err) => {
        console.log('Unable to get all reports with POGs', err);
        reject('getPOGsAndReports');
      }
    )

  });
};

// Add new column to tables
let copySampleQcConfig = (reports) => {
  return new Promise((resolve, reject) => {

    let promises = [];

    _.forEach(reports, (report) => {

      if(report.config === null || report.seqQC === null || report.sampleInfo === null) {
        console.log('Updating POG', report.pog.POGID);
        // Update from POG if POG is not null
        report.config = report.pog.config;
        report.seqQC = report.pog.seqQC;
        report.sampleInfo = report.pog.sampleInfo;

        promises.push(report.save());
      }

    });

    Promise.all(promises).then(
      (result) => {
        resolve(true);
      },
      (err) => {
        console.log('Updated all configs, seqQC, and sample Infos');
        reject(false);
      }
    )

  });
};

console.log('[MIGRATION]', 'Starting Migration');

// Start migration chain
getPOGsAndReports()
  .then(copySampleQcConfig)
  .then((success) => {
    console.log('[MIGRATION]', 'Finished migrations', success);
  })
  .catch((err) => {
    console.log('[MIGRATION]', 'Failed migration', err);
  });