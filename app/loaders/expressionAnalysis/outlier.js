const fs = require('fs');
const _ = require('lodash');
const parse = require('csv-parse/lib/sync');
const nconf = require('nconf').argv().env().file({file: '../../../config/columnMaps.json'});
const db = require('../../models');
const remapKeys = require('../../libs/remapKeys');
const p2s = require('../../libs/pyToSql');

const {logger} = process;

let baseDir;

/**
 * Parse Expression Outliers File
 *
 * @param {object} report - POG report model object
 * @param {string} expressionOutlierFile - Name of CSV file for given small mutation type
 * @param {string} outlierType - OutlierType of these entries (clinical, nostic, biological)
 * @returns {Promise.<Array.<object>>} - Returns expression outlier values from parsed file
 *
 */
const parseExpressionOutlierFile = async (report, expressionOutlierFile, outlierType) => {
  // First parse in therapeutic
  const output = fs.readFileSync(`${baseDir}/JReport_CSV_ODF/${expressionOutlierFile}`, {delimiter: ','});

  // Parse file!
  const result = parse(output, {delimiter: ',', columns: true});

  // Remap results
  const entries = remapKeys(result, nconf.get('expressionAnalysis:outlier'));

  // Add new values for DB
  const expOutEntries = entries.map((value) => {
    // Map needed DB column values
    const newValue = p2s(value, ['rnaReads', 'foldChange', 'ptxPogPerc', 'ptxTotSampObs', 'ptxkIQR', 'ptxPerc']);
    newValue.pog_id = report.pog_id;
    newValue.pog_report_id = report.id;
    newValue.outlierType = outlierType;
    newValue.expType = 'rna';
    return newValue;
  });

  // Log progress
  logger.info(`Parsed .csv for: ${outlierType}`);

  return expOutEntries;
};

/**
 * Expression - Outliers Loader
 *
 * Load values for "Expression Analysis"
 * sources:
 *  - exp_biol.csv          -Biological
 *  - exp_pot_clin_rel.csv  -Clinical
 *  - exp_prog_diag.csv     -Nostic
 *
 * Create DB entries for Expression Outliers. Parse in CSV values, mutate, insert.
 *
 * @param {object} report - POG report model object
 * @param {string} dir - Base directory to load from
 * @param {object} logger - Logging utility
 * @returns {Promise.<object>} - Returns an object with the results of the created db entries
 */
module.exports = async (report, dir) => {
  baseDir = dir;

  // Small Mutations to be processed
  const sources = [
    {file: 'exp_biol.csv', type: 'biological'},
    {file: 'exp_pot_clin_rel.csv', type: 'clinical'},
    {file: 'exp_prog_diag.csv', type: 'nostic'},
  ];

  // Loop over sources and collect promises
  const promises = sources.map((input) => {
    return parseExpressionOutlierFile(report, input.file, input.type);
  });

  // Wait for all promises to be resolved
  const results = await Promise.all(promises);
  const flatResults = _.flattenDepth(results, 2);
  // Log progress
  logger.info(`Expression Outliers collected: ${flatResults.length}`);

  // Load into Database
  const result = await db.models.outlier.bulkCreate(flatResults);

  // Successful create into DB
  logger.info('Database entries created.');

  return {loader: 'expressionOutliers', result: true, data: result};
};
