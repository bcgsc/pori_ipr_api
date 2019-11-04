const fs = require('fs');
const parse = require('csv-parse/lib/sync');
const nconf = require('nconf').argv().env().file({file: './config/columnMaps.json'});
const db = require('../../models');
const remapKeys = require('../../libs/remapKeys');

const logger = require('../../log');

/**
 * Parse Variant Counts File
 *
 * @param {object} report - POG model object
 * @param {string} dir - Base directory
 *
 * @returns {Promise.<object>} - Returns created variant counts entry
 */
module.exports = async (report, dir) => {
  // First parse in therapeutic
  const output = fs.readFileSync(`${dir}/JReport_CSV_ODF/variant_counts.csv`);

  logger.info('Found and read variant_counts.csv file.');

  // Parse file!
  const result = parse(output, {delimiter: ',', columns: true});

  if (result.length > 1) {
    throw new Error(`[${report.ident}][Loader][Summary.VariantCounts] More than one patient variants count entry found.`);
  }

  // Remap results
  const entry = remapKeys(result, nconf.get('summary:variantCounts')).shift();

  // Map needed DB column values
  entry.pog_id = report.pog_id;
  entry.pog_report_id = report.id;

  // Add to Database
  await db.models.variantCounts.create(entry);
  logger.info('Finished Variant Counts.');

  return entry;
};
