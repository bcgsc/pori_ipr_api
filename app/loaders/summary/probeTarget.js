const fs = require('fs');
const parse = require('csv-parse/lib/sync');
const _ = require('lodash');
const colMap = require('nconf').file({file: './config/columnMaps.json'});
const db = require('../../models');
const remapKeys = require('../../libs/remapKeys');

const logger = require('../../../lib/log');

/**
 * Parse Alterations File
 *
 * @param {object} report - POG report model object
 * @param {string} probeFile - name of CSV file for given alteration type
 * @param {string} probeDir - /app/libs/logger instance
 *
 * @returns {Promise.<object>} - Returns all alteration entries of the parsed file
 */
const parseAlterationsFile = async (report, probeFile, probeDir) => {
  // First parse in therapeutic
  const output = fs.readFileSync(`${probeDir}/JReport_CSV_ODF/${probeFile}`);

  // Parse file!
  const result = parse(output, {delimiter: ',', columns: true});

  // Remap results
  const entries = remapKeys(result, colMap.get('summary:probeTargets'));

  // Add new values for DB
  entries.forEach((value) => {
    // Map needed DB column values
    value.pog_id = report.pog_id;
    value.pog_report_id = report.id;
    value.newEntry = false;
  });

  logger.info(`Parsed ${probeFile}.csv`);

  return entries;
};

/**
 * Alterations Loader
 *
 * Load values for "Alterations with potential clinical relevance"
 * sources:
 *  - clin_rel_known_alt_detailed.csv   -Therapeutic
 *  - clin_rel_known_biol_detailed.csv  -Biological
 *  - clin_rel_known_diag_detailed.csv  -Diagnostic
 *  - clin_rel_known_prog_detailed.csv  -Prognostic
 *  - clin_rel_unknown_alt_detailed.csv -Unknown
 *
 * Create DB entries for Alterations. Parse in CSV values, mutate, insert.
 *
 * @param {object} report - POG report model object
 * @param {string} basedir - Base working directory
 * @param {object} options - Module options
 *
 * @returns {Promise.<object>} - Returns a loader success object
 *
 */
module.exports = async (report, basedir, options) => {
  // Read in config file.
  const {config} = options;
  // Set probe directory from Python config
  const probeDir = config.Probe_Report_Folder;

  // Alterations to be processed
  const sources = [
    'clin_rel_known_alt_detailed.csv',
    'clin_rel_known_biol_detailed.csv',
    'clin_rel_known_diag_detailed.csv',
    'clin_rel_known_prog_detailed.csv',
    'clin_rel_unknown_alt_detailed.csv',
  ];

  const promises = [];

  sources.forEach((input) => {
    if (!fs.existsSync(`${probeDir}/JReport_CSV_ODF/${input}`)) {
      //logger.error(`Unable to find probe report data. Missing input file(s): ${input}`);
      return;
      //throw new Error(`Failed to find the file for probe targeting: ${probeDir}/JReport_CSV_ODF/${input}`);
    }
    promises.push(parseAlterationsFile(report, input, probeDir));
  });

  if (promises.length === 0) {
    logger.info('Probe Target Gene data not available.');
    return null;
  }

  // Wait for all promises to be resolved
  const results = await Promise.all(promises);
  const flatResults = _.flattenDepth(results, 2);
  // Log progress
  logger.info(`Variations collected: ${flatResults.length}`);

  const entries = [];
  // Process Results
  flatResults.forEach((value) => {
    if (!entries.find((entry) => {
      return entry.gene === value.gene && entry.variant === value.variant && entry.sample === value.sample;
    })) {
      entries.push({
        gene: value.gene,
        variant: value.variant,
        sample: value.sample,
        pog_id: report.pog_id,
        pog_report_id: report.id,
      });
    }
  });

  await db.models.probeTarget.bulkCreate(entries);
  // Successfull create into DB
  logger.info('Database entries created.');

  return {module: 'probeTarget', result: true};
};
