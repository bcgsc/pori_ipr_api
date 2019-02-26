const fs = require('fs');
const _ = require('lodash');
const parse = require('csv-parse');
const nconf = require('nconf').argv().env().file({file: '../../../config/columnMaps.json'});
const db = require('../../models');
const remapKeys = require('../../libs/remapKeys');
const p2s = require('../../libs/pyToSql');

const {logger} = process;

let baseDir;

/**
 * Parse Small Mutations File
 *
 * @param {object} report - POG report model object
 * @param {string} smallMutationFile - name of CSV file for given small mutation type
 * @param {string} mutationType - mutationType of these entries (clinical, nostic, biological, unknown)
 * @returns {Promise.<Array.<object>>} - Returns the results of the parsed small mutation file
 *
 */
const parseSmallMutationFile = async (report, smallMutationFile, mutationType) => {
  // Check that the provided alterationType is valid according to the schema
  if (!db.models.smallMutations.rawAttributes.mutationType.values.includes(mutationType)) {
    throw new Error(`Invalid MutationType. Given: ${mutationType}`);
  }

  // First parse in therapeutic
  const output = fs.readFileSync(`${baseDir}/JReport_CSV_ODF/${smallMutationFile}`, {encoding: 'utf8'});

  // Parse file!
  const result = parse(output, {delimiter: ',', columns: true});

  // Remap results
  const entries = remapKeys(result, nconf.get('somaticMutations:smallMutations'));

  // Add new values for DB
  entries.forEach((value) => {
    // Map needed DB column values
    value.pog_id = report.pog_id;
    value.pog_report_id = report.id;
    value.mutationType = mutationType;
    value.TCGAPerc = p2s(value.TCGAPerc);
  });

  // Log progress
  logger(`Parsed .csv for: ${mutationType}`);

  return entries;
};

/**
 * Somatic Mutations - Small Mutations Loader
 *
 * Load values for "Small Mutations: Genomic Details"
 * sources:
 *  - sm_biol.csv             -Biological
 *  - sm_known_clin_rel.csv   -Clinical
 *  - sm_prog_diag.csv        -Nostic
 *  - sm_unknown.csv          -Unknown
 *
 * Create DB entries for Small Mutations. Parse in CSV values, mutate, insert.
 *
 * @param {object} report - POG report associated with small mutations
 * @param {object} dir - The directory to use as the base directory for loading files
 * @returns {Promise.<object>} - Returns the result of successfully loading the small mutations into the db
 *
 */
module.exports = async (report, dir) => {
  baseDir = dir;

  // Small Mutations to be processed
  const sources = [
    {file: 'sm_biol.csv', type: 'biological'},
    {file: 'sm_known_clin_rel.csv', type: 'clinical'},
    {file: 'sm_prog_diag.csv', type: 'nostic'},
    {file: 'sm_uncertain.csv', type: 'unknown'},
  ];

  // Loop over sources and collect promises
  const promises = sources.map((input) => {
    return parseSmallMutationFile(report, input.file, input.type);
  });

  // Wait for all promises to be resolved
  const results = await Promise.all(promises);

  const flatResults = _.flattenDepth(results, 2);

  // Log progress
  logger.info(`Small Mutations collected: ${flatResults.length}`);

  // Load into Database
  const result = await db.models.smallMutations.bulkCreate(flatResults);

  // Successful create into DB
  logger.info('Database entries created.');

  return {loader: 'smallMutations', result: true, data: result};
};
