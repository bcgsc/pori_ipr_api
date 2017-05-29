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
let createAnalysisForeignKey = () => {

  return new Promise((resolve, reject) => {
    console.log('[MIGRATION][createAnalysisForeignKey] Starting Migration');

    db.query('ALTER TABLE pog_analysis_reports ADD COLUMN analysis_id integer DEFAULT null').then(
      (result) => {

        db.query('ALTER TABLE pog_analysis_reports ADD CONSTRAINT "pog_analysis_id_fkey" FOREIGN KEY (analysis_id) REFERENCES pog_analysis(id) ON DELETE CASCADE;').then(
          (result) => {
            console.log('[MIGRATION][createAnalysisForeignKey] Completed successfully');
            resolve('success');
          },
          (err) => {
            console.log(err);
            console.log('Unable to add analysis_id constraint to pog_analysis_reports.');
            reject('Unable to add analysis_id constraint to pog_analysis_reports.');
          }
        )


      },
      (err) => {
        console.log(err);
        console.log('Unable to add analysis_id column to pog_analysis_reports.');
        reject('Unable to add analysis_id column to pog_analysis_reports.');
      }
    )

  });

};

// Get POGs
let createAnalysis = () => {

  return new Promise((resolve, reject) => {
    console.log('[MIGRATION][createAnalysis] Starting Migration');

    // Get All Pogs
    db.models.POG.findAll({include: [ {as: 'analysis_reports', model: db.models.analysis_report.scope('public')}]}).then(
      (pogs) => {

        // Library Indexed Collection
        let normalLib = {};
        let entries = [];
        let promises = [];

        // Create new entry for each
        _.forEach(pogs, (pog) => {

          // Determine normal library
          let entry = {};
          entry.libraries = {normal: null, tumour: null, transcriptome: null};
          entry.pog_id = pog.id;
          entry.name = 'biopsy 1';

          if(pog.analysis_reports.length === 0) return;

          _.forEach(pog.analysis_reports[0].seqQC, (library) => {
            if(library.sample = 'Constitutional DNA') entry.libraries.normal = library.Library;
            if(library.sample = 'Tumour RNA') entry.libraries.transcriptome = library.Library;
            if(library.sample = 'Tumour DNA') entry.libraries.tumour = library.Library;
          });

          if(!normalLib[entry.libraries.normal]) normalLib[entry.libraries.normal] = entry;

        });

        // Create promises
        _.forEach(normalLib, (e) => {
          entries.push(e);
        });

        db.models.pog_analysis.bulkCreate(entries).then(
          (result) => {
            console.log('[MIGRATION][createAnalysis] Completed successfully');
            resolve(result);
          },
          (err) => {
            console.log(err);
            reject('Unable to create bulk analysis report entries');
          }
        );
      },
      (err) => {

      }
    )
  });
};

// Add Foreign Key to Analysis Reports
let addForeignKeyValue = () => {

  return new Promise((resolve, reject) => {
    console.log('[MIGRATION][addForeignKeyValue] Starting migration');

    db.models.pog_analysis.findAll().then(
      (analysis) => {

        console.log('[MIGRATION][addForeignKeyValue] Got all analysis');

        // Select all reports and map to pog_analysis
        db.models.analysis_report.findAll().then(
          (reports) => {

            console.log('[MIGRATION][addForeignKeyValue] Got all reports');

            let promises = [];

            _.forEach(reports, (report) => {
              // Find
              let findAnalysis = _.find(analysis, {pog_id: report.pog_id});

              if(findAnalysis !== undefined && findAnalysis !== null) {
                let update = {analysis_id: findAnalysis.id};
                let opts = {where: {id: report.id}};
                promises.push(db.query('UPDATE pog_analysis_reports SET analysis_id = '+ findAnalysis.id + ' WHERE id = ' + report.id + ';'));
              }

            });
            console.log('[MIGRATION][addForeignKeyValue] Created promises');

            Q.all(promises).then(
              (success) => {
                console.log('[MIGRATION][addForeignKeyValue] Successfully insert all keys');
                resolve();
              },
              (err) => {
                console.log('[MIGRATION][addForeignKeyValue] Failed to save updated analysis_report', err);
              }
            )


          },
          (err) => {
            console.log('[MIGRATION][addForeignKeyValue] Unable to find reports', err);
            reject('Unable to find reports');
          }
        )

      },
      (err) => {
        console.log('[MIGRATION][addForeignKeyValue] Unable to find analysis', err);
        reject('Unable to find analysis');
      }
    );



  });

};

console.log('[MIGRATION]', 'Starting Migration');

// Start migration chain
createAnalysisForeignKey()
  .then(createAnalysis)
  .then(addForeignKeyValue)
  .then((success) => {
    console.log('[MIGRATION]', 'Finished migrations');
  })
  .catch((err) => {
    console.log('[MIGRATION]', 'Failed migration', err);
  });