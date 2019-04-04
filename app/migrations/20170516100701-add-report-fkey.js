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
  //{current: 'summary.patientInformation',           updated: 'pog_patient_information'}
];

// Add Foreign Keys to Tables
let addForeignKeyConstraint = (tbls) => {
  return new Promise((resolve, reject) => {

    console.log('[MIGRATION][addForeignKeyConstraint]', 'Adding report foreign key constraints');

    let promises = [];

    _.forEach(tbls, (tbl) => {
      let prefixBits = tbl.updated.split('_');
      let prefix = prefixBits[prefixBits.length-1]+prefixBits[prefixBits.length-2];
      //console.log('ALTER TABLE "' + tbl.updated + '" ADD CONSTRAINT "FK_'+prefix+'.pog_analysis_report" FOREIGN KEY (pog_report_id) REFERENCES pog_analysis_reports(id) ON DELETE CASCADE;');
      promises.push(db.query('ALTER TABLE "' + tbl.updated + '" ADD CONSTRAINT "FK_'+prefix+'.pog_analysis_report" FOREIGN KEY (pog_report_id) REFERENCES pog_analysis_reports(id) ON DELETE CASCADE;'));
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



console.log('[MIGRATION]', 'Starting Migration');

// Start migration chain
addForeignKeyConstraint(tables)
  .then((success) => {
    console.log('[MIGRATION]', 'Finished migrations', success);
  })
  .catch((err) => {
    console.log('[MIGRATION]', 'Failed migration', err);
  });

