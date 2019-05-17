const fs = require('fs');
const parse = require('csv-parse');
const nconf = require('nconf').argv().env().file({file: './config/columnMaps.json'});
const db = require('../../models');
const remapKeys = require('../../libs/remapKeys');

const {logger} = process;

/**
 * Parse Genomic Events With Potential Clinical Association File
 *
 * @param {object} report - POG report model object
 * @param {string} dir - CSV directory base
 *
 * @returns {Promise.<Array.<object>>} - Returns genomic events that were loaded into the db
 */
module.exports = async (report, dir) => {
  // First parse in therapeutic
  const output = fs.readFileSync(`${dir}/JReport_CSV_ODF/genomic_events_thera_assoc.csv`);

  logger.info('Found and read genomic_events_thera_assoc.csv file.');

  // Parse file!
  const results = parse(output, {delimiter: ',', columns: true});

  // Create Entries Array
  const entries = remapKeys(results, nconf.get('summary:genomicEventsTherapeutic'));

  // Loop over returned rows, and read in each column value
  entries.forEach((entry) => {
    entry.pog_id = report.pog_id;
    entry.pog_report_id = report.id;
    if (report.type === 'probe') {
      entry.reportType = 'probe';
    }
  });

  logger.info(`Entries found: ${entries.length}`);

  // Add to Database
  const createResult = await db.models.genomicEventsTherapeutic.bulkCreate(entries);
  logger.info('Finished Genomic Events With Therapeutic Association.');

  return createResult;
};
