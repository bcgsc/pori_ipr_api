const fs = require('fs');
const parse = require('csv-parse/lib/sync');
const db = require('../../models');

const logger = require('../../log');

/**
 * Load Probe test information
 *
 * @param {object} report - POG report model object
 * @param {string} dir - CSV Base directory
 * @returns {Promise.<object>} - Returns the created entry
 *
 */
module.exports = async (report, dir) => {
  // Parse input file
  const output = fs.readFileSync(`${dir}/JReport_CSV_ODF/probe_test_info.csv`);

  logger.info('Found and read probe_test_info.csv file.');

  // Parse file!
  const result = parse(output, {delimiter: ',', columns: true});
  if (result.length === 0) {
    throw new Error(`Unable to find test file ${dir}/JReport_CSV_ODF/probe_test_info.csv`);
  }

  if (result.length > 1) {
    throw new Error(`[${report.ident}][Loader][ProbeTestInformation] More than one probe test information entry found.`);
  }

  const [entry] = result;

  // Map needed DB column values
  entry.pog_id = report.pog_id;
  entry.report_id = report.id;

  // Add to Database
  await db.models.probe_test_information.create(entry);
  // Done
  logger.info('Probe test information loaded.');

  return entry;
};
