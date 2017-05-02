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

// Add new columns to tables
let tables = [
  {current: 'copyNumberAnalysis.cnv',               updated: 'pog_analysis_reports_copy_number_analysis_cnv'},
  {current: 'expression.drugTarget',                updated: 'pog_analysis_reports_expression_drug_target'},
  {current: 'detailedGenomicAnalysis.alterations',  updated: 'pog_analysis_reports_dga_alterations'},
  {current: 'detailedGenomicAnalysis.targetedGenes',updated: 'pog_analysis_reports_dga_targeted_genes'},
  {current: 'expression.outlier',                   updated: 'pog_analysis_reports_expression_outlier'},
  {current: 'somaticMutations.mutationSignature',   updated: 'pog_analysis_reports_somatic_mutations_mutation_signature'},
  {current: 'somaticMutations.smallMutations',      updated: 'pog_analysis_reports_somatic_mutations_small_mutations'},
  {current: 'structuralVariation.sv',               updated: 'pog_analysis_reports_structural_variation_sv'},
  {current: 'summary.analystComments',              updated: 'pog_analysis_reports_summary_analyst_comments'},
  {current: 'summary.genomicAlterationsIdentified', updated: 'pog_analysis_reports_summary_genomic_alterations_identified'},
  {current: 'summary.genomicEventsTherapeutic',     updated: 'pog_analysis_reports_summary_genomic_events_therapeutic'},
  {current: 'summary.mutationSummary',              updated: 'pog_analysis_reports_summary_mutation_summary'},
  {current: 'summary.pathwayAnalysis',              updated: 'pog_analysis_reports_summary_pathway_analysis'},
  {current: 'summary.probeTarget',                  updated: 'pog_analysis_reports_summary_probe_target'},
  {current: 'summary.tumourAnalysis',               updated: 'pog_analysis_reports_summary_tumour_analysis'},
  {current: 'summary.variantCounts',                updated: 'pog_analysis_reports_summary_variant_counts'},
  {current: 'therapeuticTargets',                   updated: 'pog_analysis_reports_therapeutic_targets'},
  {current: 'imageData',                            updated: 'pog_analysis_reports_image_data'},
  {current: 'summary.patientInformation',           updated: 'pog_patient_information'}
];


// Make POG Report Ident String
let makeReportIdent = () => {
  let ident = "";
  let chars = "ABCDEFGHIJKLMNOPQRSTUVQXYZ0123456789";

  for(let i=0; i < 5; i++) {
    ident += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return ident;
};


// Add new column to tables
let addReportColumn = (tbls) => {
  return new Promise((resolve, reject) => {

    console.log('[MIGRATION][addReportColumn]', 'Adding report column');

    let promises = [];

    _.forEach(tbls, (tbl) => {
      promises.push(db.query('ALTER TABLE "' + tbl.current + '" ADD COLUMN "pog_report_id" INTEGER;'));
    });

    Promise.all(promises).then(
      (success) => {
        console.log('[MIGRATION][addReportColumn]', 'All columns added to tables');
        resolve(tbls); // Send the tables down the line to the next section
      },
      (err) => {
        console.log('[MIGRATION][addReportColumn]', 'Unable to add columns to tables', err);
        reject('addReportColumn');
      }
    )
  });
};

// Add Foreign Keys to Tables
let addForeignKeyConstraint = (tbls) => {
  return new Promise((resolve, reject) => {

    console.log('[MIGRATION][addForeignKeyConstraint]', 'Adding report foreign key constraints');

    let promises = [];

    _.forEach(tbls, (tbl) => {
      promises.push(db.query('ALTER TABLE "' + tbl.current + '" ADD CONSTRAINT "FK_pog_analysis_report" FOREIGN KEY (pog_report_id) REFERENCES pog_analysis_reports(id) ON DELETE CASCADE;'));
    });

    Promise.all(promises).then(
      (success) => {
        console.log('[MIGRATION][addForeignKeyConstraint]', 'All tables have foreign keys defined');
        resolve(tbls); // Send the tables down the line to the next section
      },
      (err) => {
        console.log('[MIGRATION][addForeignKeyConstraint]', 'Unable to define foreign keys', err);
        reject('addForeignKeyConstraint');
      }
    )
  });
};

// Rename Tables
let renameTables = (tbls) => {
  return new Promise((resolve, reject) => {

    console.log('[MIGRATION][renameTables]', 'Renaming tables');

    let promises = [];

    _.forEach(tbls, (tbl) => {
      promises.push(db.query('ALTER TABLE "' + tbl.current + '" RENAME TO "' + tbl.updated + '";'));
    });

    Promise.all(promises).then(
      (success) => {
        console.log('[MIGRATION][renameTables]', 'All tables renamed.');
        resolve(tbls); // Send the tables down the line to the next section
      },
      (err) => {
        console.log('[MIGRATION][renameTables]', 'Unable to rename tables', err);
        reject('renameTables');
      }
    )
  });
};

// Create Report Entries
let createReportEntries = (tbls) => {

  console.log('[MIGRATION][renameTables]', 'Creating report entries for each existing POG');

  return new Promise((resolve, reject) => {

    // Get all POGs
    db.models.POG.findAll().then(
      (pogs) => {

        // Create the entries
        let entries = [];

        _.forEach(pogs, (pog) => {
          entries.push({
            pog_id: pog.id,
            ident: makeReportIdent(),
            createdBy_id: 1,
            sampleInfo: pog.sampleInfo,
            seqQC: pog.seqQC,
            config: pog.config
          })
        });

        db.models.analysis_report.bulkCreate(entries).then(
          (result) => {
            // Successfully created pog report entries

            // Get All created entries
            db.models.analysis_report.findAll().then(
              (reports) => {
                resolve(reports);
              },
              (err) => {
                reject('createReportEntries - get all');
              }
            )
          },
          (err) => {
            console.log('[MIGRATION][createReportEntries]', 'Unable to make pog entries.', err);
            reject('createReportEntries - Create entries');
          }
        );

      },
      (err) => {
        console.log('[MIGRATION][createReportEntries]', 'Unable to find all pogs.', err);
        reject('createReportEntries - Find all pogs');
      }
    )

  });
};


// Fill Report Column Value
let fillReportValues = (reports) => {

  console.log('[MIGRATION][fillReportValues]', 'Backfill existing pog genomic report tables with new report values');

  return new Promise((resolve, reject) => {
    // Build the case statement
    let caseClause = 'SET pog_report_id = CASE pog_id ';
    _.forEach(reports, (report) => {
      caseClause += 'WHEN ' + report.pog_id + ' THEN ' + report.id;
    });

    caseClause += ' else 1 end';

    let promises = [];

    // For each table, update for each report
    _.forEach(tables, (table) => {
      promises.push(db.query('UPDATE ' + table.updated + ' ' + caseClause));
    });

    Promise.all(promises).then(
      (results)=> {
        console.log('[MIGRATION][fillReportValues]', 'Updated report column on all tables. ');
        resolve('fillReportValues');
      },
      (err) => {
        console.log('[MIGRATION][fillReportValues]', 'Unable to update report column on all pogs. ', err);
        reject('fillReportValues');
      }
    );

  });
};


console.log('[MIGRATION]', 'Starting Migration');

// Start migration chain
addReportColumn(tables)
  .then(addForeignKeyConstraint)
  .then(renameTables)
  .then(createReportEntries)
  .then(fillReportValues)
  .then((success) => {
    console.log('[MIGRATION]', 'Finished migrations', success);
  })
  .catch((err) => {
    console.log('[MIGRATION]', 'Failed migration', err);
  });

