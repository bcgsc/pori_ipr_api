const fs = require('fs');
const parse = require('csv-parse/lib/sync');
const nconf = require('nconf').argv().env().file({file: './config/columnMaps.json'});
const db = require('../../models');
const remapKeys = require('../../libs/remapKeys');

const {logger} = process;

/**
 * Parse Approved Therapries in this Cancer File
 *
 * @param {object} report - POG report model object
 * @param {string} dir - Name of directory
 *
 * @returns {Promise.<object>} - Returns whether parsed file was entered into db successfully
 */
module.exports = async (report, dir) => {
  // First parse in therapeutic
  const output = fs.readFileSync(`${dir}/JReport_CSV_ODF/approved_detailed.csv`);

  // Parse file!
  const result = parse(output, {delimiter: ',', columns: true});
  // Remap results
  const entries = remapKeys(result, nconf.get('detailedGenomicAnalysis:alterations'));

  // Add new values for DB
  entries.forEach((entry) => {
    // Map needed DB column values
    entry.pog_id = report.pog_id;
    entry.pog_report_id = report.id;
    entry.alterationType = 'therapeutic';
    entry.approvedTherapy = 'thisCancer';
    entry.newEntry = false;
    if (report.type === 'probe') {
      entry.reportType = 'probe';
      entry.report = 'probe';
    }
  });

  // Log progress
  logger.info('Parsed .csv for: approved_detailed.csv');

  await db.models.alterations.bulkCreate(entries);
  // Successfull create into DB
  logger.info('Database entries created.');

  return {approvedThisCancer: true};
};
