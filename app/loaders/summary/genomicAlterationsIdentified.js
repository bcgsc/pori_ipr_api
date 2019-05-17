const fs = require('fs');
const _ = require('lodash');
const parse = require('csv-parse/lib/sync');
const db = require('../../models');

const logger = require('../../../lib/log');

/**
 * Parse Genomic Alterations Identified File
 *
 * @param {object} report - POG model object
 * @param {string} dir - Base directory
 * @returns {Promise.<Array.<object>>} - Returns the results of loading the genomic alterations into the db
 */
module.exports = async (report, dir) => {
  // First parse in therapeutic
  const output = fs.readFileSync(`${dir}/JReport_CSV_ODF/genomic_alt_identified.csv`);

  logger.info('Found and read genomic_alt_identified.csv file.');

  // Parse file!
  const results = parse(output, {delimiter: ','});
  results.shift();

  const entries = [];

  // Loop over returned rows, and read in each column value
  _.flatten(results).forEach((value) => {
    // Check for empty value
    if (value !== '') {
      entries.push({
        pog_id: report.pog_id,
        pog_report_id: report.id,
        geneVariant: value,
      });
    }
  });

  // Add to Database
  const createResult = await db.models.genomicAlterationsIdentified.bulkCreate(entries);
  logger.info('Finished Genomic Alterations Identified.');

  return createResult;
};
