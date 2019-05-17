const fs = require('fs');
const parse = require('csv-parse/lib/sync');
const nconf = require('nconf').argv().env().file({file: './config/columnMaps.json'});
const db = require('../../models');
const remapKeys = require('../../libs/remapKeys');

const {logger} = process;

/**
 * Parse Approved Therapries in Other Cancer File
 *
 * @param {object} report - POG model object
 * @param {string} dir - POG model object
 *
 * @returns {Promise.<object>} - Returns object with db create success info
 */
module.exports = async (report, dir) => {
  // First parse in therapeutic
  const output = fs.readFileSync(`${dir}/JReport_CSV_ODF/approved_other_cancer_type_detailed.csv`);

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
    entry.approvedTherapy = 'otherCancer';
    entry.newEntry = false;
    if (report.type === 'probe') {
      entry.reportType = 'probe';
      entry.report = 'probe';
    }
  });

  logger.info('Parsed .csv for: approved_other_cancer_type_detailed.csv');
  await db.models.alterations.bulkCreate(entries);
  logger.info('Database entries created.');

  return {module: 'approvedOtherCancer', result: true};
};
