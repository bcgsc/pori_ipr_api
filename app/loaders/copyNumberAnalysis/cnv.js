const fs = require('fs');
const _ = require('lodash');
const parse = require('csv-parse/lib/sync');
const nconf = require('nconf').argv().env().file({file: './config/columnMaps.json'});
const db = require('../../models');
const remapKeys = require('../../libs/remapKeys');
const logger = require('../../log');

let baseDir;

/**
 * Parse Copy Number Analysis CNV File
 *
 * @param {object} report - POG model object
 * @param {string} cnvFile - Name of CSV file for given small mutation type
 * @param {string} cnvVariant - cnvVariant of these entries (clinical, nostic, biological, unknown)
 *
 * @returns {Promise.<Array.<object>>} - Returns the cnv entries for the parsed file
 */
const parseCnvFile = async (report, cnvFile, cnvVariant) => {
  // Check that the provided alterationType is valid according to the schema
  if (!db.models.cnv.rawAttributes.cnvVariant.values.includes(cnvVariant)) {
    throw new Error(`Invalid cnvVariant. Given: ${cnvVariant}`);
  }

  // First parse in therapeutic
  const output = fs.readFileSync(`${baseDir}/JReport_CSV_ODF/${cnvFile}`);

  // Parse file!
  const result = parse(output, {delimiter: ',', columns: true});

  // Remap results
  const entries = remapKeys(result, nconf.get('copyNumberAnalysis:cnv'));

  // Add new values for DB
  entries.forEach((entry) => {
    // Map needed DB column values
    entry.pog_id = report.pog_id;
    entry.report_id = report.id;
    entry.cnvVariant = cnvVariant;
  });

  // Log progress
  logger.info(`Parsed .csv for: ${cnvVariant}`);

  return entries;
};

/**
 * Copy Number Analysis - CNV Loader
 *
 * Load values for "Copy Number Analysis"
 * sources:
 *  - cnv_amplified_oncogenes.csv             -Commonly Amplified Oncogenes with Copy Gains
 *  - cnv_biol.csv                            -Biological
 *  - cnv_high_exp_oncogenes_copy_gains.csv   -Highly Expressed Oncgogenes with Copy Gains
 *  - cnv_homozygous_del_tsg.csv              -Homozygously Deleted Tumour Suppressors
 *  - cnv_low_exp_tsg_copy_losses.csv         -Lowly expressed Tumour Suppressor Genes with Copy Losses
 *  - cnv_pot_clin_rel.csv                    -CNVs of potential clinical relevance
 *  - cnv_prog_diag.csv                       -Prognostic or Diagnostic
 *
 * Create DB entries for Small Mutations. Parse in CSV values, mutate, insert.
 *
 * @param {object} report - POG report model object
 * @param {string} dir - Base directory
 *
 * @returns {Promise.<object>} - Returns an object indicating the load was successfull
 */
module.exports = async (report, dir) => {
  baseDir = dir;

  // Small Mutations to be processed
  const sources = [
    {file: 'cnv_amplified_oncogenes.csv', type: 'commonAmplified'},
    {file: 'cnv_biol.csv', type: 'biological'},
    {file: 'cnv_high_exp_oncogenes_copy_gains.csv', type: 'highlyExpOncoGain'},
    {file: 'cnv_homozygous_del_tsg.csv', type: 'homodTumourSupress'},
    {file: 'cnv_low_exp_tsg_copy_losses.csv', type: 'lowlyExpTSloss'},
    {file: 'cnv_pot_clin_rel.csv', type: 'clinical'},
    {file: 'cnv_prog_diag.csv', type: 'nostic'},
  ];

  // Loop over sources and collect promises
  const promises = sources.map((input) => {
    return parseCnvFile(report, input.file, input.type);
  });

  // Wait for all promises to be resolved
  const results = await Promise.all(promises);
  const flatResults = _.flattenDepth(results, 2);

  // Log progress
  logger.info(`CNVs collected: ${flatResults.length}`);

  // Load into Database
  await db.models.cnv.bulkCreate(flatResults);

  // Successful create into DB
  logger.info('Database entries created.');

  return {cnv: true};
};
