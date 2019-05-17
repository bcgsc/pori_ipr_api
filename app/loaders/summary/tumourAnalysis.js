const fs = require('fs');
const parse = require('csv-parse/lib/sync');
const nconf = require('nconf').argv().env().file({file: './config/columnMaps.json'});
const db = require('../../models');
const remapKeys = require('../../libs/remapKeys');

const logger = require('../../../lib/log');

/**
 * Parse Patient Tumour Analysis File
 *
 * @param {object} report - POG model object
 * @param {string} dir - Base directory
 *
 * @returns {Promise.<object>} - Returns the created tumour analysis
 */
module.exports = async (report, dir) => {
  // First parse in therapeutic
  const output = fs.readFileSync(`${dir}/JReport_CSV_ODF/patient_tumour_analysis.csv`);

  logger.info('Found and read patient_tumour_analysis.csv file.');

  // Parse file!
  const result = parse(output, {delimiter: ',', columns: true});

  if (result.length > 1) {
    throw new Error(`[${report.ident}][Loader][Summary.TumourAnalysis] More than one patient tumour analysis entry found.`);
  }

  // Remap results
  const entry = remapKeys(result, nconf.get('summary:tumourAnalysis')).shift();

  if (!entry) {
    throw new Error('Failed to find tumour analysis information in file');
  }

  if (parseInt(entry.tumourContent).toString().length !== entry.tumourContent.length) {
    logger.error('Non-integer tumour content detected');
    throw new Error('Tumour content was not an integer');
  }

  // Map needed DB column values
  entry.pog_id = report.pog_id;
  entry.pog_report_id = report.id;

  // Add to Database
  await db.models.tumourAnalysis.create(entry);
  logger.info('Finished Patient tumour analysis.');

  return entry;
};
