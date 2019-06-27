const fs = require('fs');
const parse = require('csv-parse/lib/sync');
const nconf = require('nconf').argv().env().file({file: './config/columnMaps.json'});
const db = require('../../models');
const remapKeys = require('../../libs/remapKeys');
const p2s = require('../../libs/pyToSql');

const logger = require('../../../lib/log');

/**
 * Parse Expression Drug Target Analysis File
 *
 * @param {object} report - POG Report model object
 * @param {string} dir - Base directory for loading sources
 *
 * @returns {Promise.<object>} - Returns the results of adding the Drug Tarkets to the db
 */
module.exports = async (report, dir) => {
  // First parse in therapeutic
  const output = fs.readFileSync(`${dir}/JReport_CSV_ODF/therapeutic_targets.csv`);

  logger.info('Found and read therapeutic_targets.csv file.');

  // Parse file!
  const result = parse(output, {delimiter: ',', columns: true});
  // Create Entries Array
  const entries = remapKeys(result, nconf.get('expressionAnalysis:drugTarget'));

  // Loop over returned rows, append row with POGid
  const drugTargetEntries = entries.map((value) => {
    const newValue = p2s(value, ['kIQR', 'kIQRNormal', 'copy']);
    newValue.pog_id = report.pog_id;
    newValue.pog_report_id = report.id;
    return newValue;
  });

  // Add to Database
  const drugTarResult = await db.models.drugTarget.bulkCreate(drugTargetEntries);
  logger.info('Finished Expression Drug Target Analysis.');

  return {module: 'drugTarget', result: true, data: drugTarResult};
};
