const nconf = require('nconf').argv().env().file({file: './config/columnMaps.json'});
const fs = require('fs');
const _ = require('lodash');
const parse = require('csv-parse/lib/sync');
const db = require('../../models');
const remapKeys = require('../../libs/remapKeys');
const logger = require('../../log');

let baseDir;

/**
 * Parse Alterations File
 *
 *
 * @param {object} report - POG report model object
 * @param {string} alterationFile - Name of CSV file for given alteration type
 * @param {string} alterationType - AlterationType of entries in file (therapeutic, biological, prognostic, diagnostic, unknown)
 *
 * @returns {Promise.<Array.<object>>} - Returns the alterations from the file
 *
 */
const parseAlterationsFile = async (report, alterationFile, alterationType) => {
  // Check that the provided alterationType is valid according to the schema
  if (!db.models.alterations.rawAttributes.alterationType.values.includes(alterationType)) {
    throw new Error(`Invalid AlterationType. Given: ${alterationType}`);
  }

  const filePath = `${baseDir}/JReport_CSV_ODF/${alterationFile}`;
  logger.info(`Looking for file: ${filePath}`);

  // First parse in therapeutic
  const output = fs.readFileSync(`${filePath}`);

  // Parse file!
  const result = parse(output, {delimiter: ',', columns: true});

  // Remap results
  const entries = remapKeys(result, nconf.get('detailedGenomicAnalysis:alterations'));

  // Add new values for DB
  entries.forEach((entry) => {
    // Map needed DB column values
    entry.pog_id = report.pog_id;
    entry.pog_report_id = report.id;
    entry.alterationType = alterationType;
    entry.newEntry = false;
    if (report.type === 'probe') {
      entry.reportType = 'probe';
      entry.report = 'probe';
    }
  });
  // Log progress
  logger.info(`Parsed ${alterationFile} for: ${alterationType} with ${entries.length} entries found`);

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
 *  - novel_events.csv                  -Novel
 *
 * Create DB entries for Alterations. Parse in CSV values, mutate, insert.
 *
 * @param {object} report - POG report model object
 * @param {string} dir - Base directory
 * @param {object} options - Module options
 *
 * @returns {Promise.<object>} - Returns true if the alterations were successfully created
 */
module.exports = async (report, dir, options) => {
  baseDir = dir;

  logger.info(`Running loader in mode: ${report.type}`);

  // Alterations to be processed
  const sources = [
    {file: 'clin_rel_known_alt_detailed.csv', type: 'therapeutic'},
    {file: 'clin_rel_known_biol_detailed.csv', type: 'biological'},
    {file: 'clin_rel_known_diag_detailed.csv', type: 'diagnostic'},
    {file: 'clin_rel_known_prog_detailed.csv', type: 'prognostic'},
    {file: 'clin_rel_unknown_alt_detailed.csv', type: 'unknown'},
    {file: 'novel_events_detailed.csv', type: 'novel'},
  ];

  // Loop over sources and collect promises
  const promises = sources.map((input) => {
    return parseAlterationsFile(report, input.file, input.type, options);
  });

  const results = await Promise.all(promises);
  const formattedResults = _.flattenDepth(results, 2);
  logger.info(`Variations collected: ${formattedResults.length}`); // Log progress

  const createdAlterations = await db.models.alterations.bulkCreate(formattedResults); // Load into Database
  // Successfull create into DB
  logger.info(`${createdAlterations.length} database entries added to ${db.models.alterations.getTableName()}`);

  return {alterations: true}; // TODO: it's unclear how this return value interacts with the loader and should possibly be revised since there is no situation in which it returns false
};
