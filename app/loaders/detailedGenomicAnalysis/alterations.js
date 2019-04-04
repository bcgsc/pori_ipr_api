// Dependencies
const nconf = require('nconf').argv().env().file({file: '../../../config/columnMaps.json'});
const fs = require('fs');
const parse = require('csv-parse');
const _ = require('lodash');
const Q = require('q');
const db = require('../../../app/models');
const remapKeys = require('../../../app/libs/remapKeys');

let baseDir;

/**
 * Parse Alterations File
 *
 *
 * @param {object} report - POG report model object
 * @param {string} alterationFile - name of CSV file for given alteration type
 * @param {string} alterationType - alterationType of entries in file (therapeutic, biological, prognostic, diagnostic, unknown)
 * @param {object} log - /app/libs/logger instance
 *
 * @returns {Promise} - the parsed entries for the given file
 *
 */
const parseAlterationsFile = (report, alterationFile, alterationType, log) => {
  // Create promise
  const deferred = Q.defer();

  // Check that the provided alterationType is valid according to the schema
  if (db.models.alterations.rawAttributes.alterationType.values.indexOf(alterationType) === -1) throw new Error(`Invalid AlterationType. Given: ${alterationType}`);

  const filePath = `${baseDir}/JReport_CSV_ODF/${alterationFile}`;
  log(`Looking for file: ${filePath}`);

  // First parse in therapeutic
  const output = fs.createReadStream(`${filePath}`, {delimiter: ','});

  // Parse file!
  const parser = parse({delimiter: ',', columns: true},
    (err, result) => {
      // Was there a problem processing the file?
      if (err) {
        deferred.reject(`Unable to parse CSV file ${alterationFile}: ${err}`);
      }

      // Remap results
      const entries = remapKeys(result, nconf.get('detailedGenomicAnalysis:alterations'));

      // Add new values for DB
      entries.forEach((v, k) => {
        // Map needed DB column values
        entries[k].pog_id = report.pog_id;
        entries[k].pog_report_id = report.id;
        entries[k].alterationType = alterationType;
        entries[k].newEntry = false;
        if (report.type === 'probe') entries[k].reportType = 'probe';
        if (report.type === 'probe') entries[k].report = 'probe';
      });

      // Log progress
      log(`Parsed ${alterationFile} for: ${alterationType} with ${entries.length} entries found`);

      // Resolve Promise
      deferred.resolve(entries);
    });

  // Pipe file through parser
  output.pipe(parser);

  output.on('error', (err) => {
    deferred.reject(err);
  });

  return deferred.promise;
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
 * @param {string} dir - base directory
 * @param {object} logger - logging interface
 * @param {object} options - module options
 *
 * @returns {Promise} - whether or not the alterations were successfully created
 */
module.exports = async (report, dir, logger, options) => {
  baseDir = dir;

  // Setup Logger
  const loader = 'DGA.Variations';
  const log = logger.loader(report.ident, loader);

  log(`Running loader in mode: ${report.type}`);

  // Alterations to be processed
  const sources = [
    {file: 'clin_rel_known_alt_detailed.csv', type: 'therapeutic'},
    {file: 'clin_rel_known_biol_detailed.csv', type: 'biological'},
    {file: 'clin_rel_known_diag_detailed.csv', type: 'diagnostic'},
    {file: 'clin_rel_known_prog_detailed.csv', type: 'prognostic'},
    {file: 'clin_rel_unknown_alt_detailed.csv', type: 'unknown'},
    {file: 'novel_events_detailed.csv', type: 'novel'},
  ];

  // Promises Array
  const promises = [];

  // Loop over sources and collect promises
  sources.forEach((input) => {
    promises.push(parseAlterationsFile(report, input.file, input.type, log, options));
  });

  // Wait for all promises to be resolved
  try {
    const results = await Promise.all(promises);
    const formattedResults = _.flattenDepth(results, 2);
    log(`Variations collected: ${formattedResults.length}`); // Log progress

    const createdAlterations = await db.models.alterations.bulkCreate(formattedResults); // Load into Database
    // Successfull create into DB
    log(`${createdAlterations.length} database entries added to ${db.models.alterations.getTableName()}`, logger.SUCCESS);
    // Done!
    return {alterations: true}; // TODO: it's unclear how this return value interacts with the loader and should possibly be revised since there is no situation in which it returns false
  } catch (err) {
    throw new Error(`Error loading DGA Alterations: ${err}`);
  }
};
