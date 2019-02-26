const fs = require('fs');
const parse = require('csv-parse/lib/sync');
const db = require('../../models');

const {logger} = process;

/**
 * Parse Targeted Gene Report File
 *
 * @param {object} report - POG report model object
 * @param {string} dir - base directory
 *
 * @returns {Promise.<Array.<object>>} - Returns db created entries
 */
module.exports = async (report, dir) => {
  // First parse in therapeutic
  const output = fs.readFileSync(`${dir}/JReport_CSV_ODF/probe_summary.csv`, {encoding: 'utf-8'});
  logger.info('Found and read probe_summary.csv file.');

  // Parse file!
  const results = parse(output, {delimiter: ',', columns: true});

  // Remap results
  const entries = [];
  const entriesMap = {};
  // Map needed DB column values
  results.forEach((value) => {
    if (`${value.Gene}-${value.Variant}` in entriesMap) {
      return;
    }

    const entry = {
      pog_id: report.pog_id,
      pog_report_id: report.id,
      gene: value.Gene,
      variant: value.Variant,
      sample: value.Sample,
    };

    entries.push(entry); // Add entry
    entriesMap[`${value.Gene}-${value.Variant}`] = true; // Add entry to map to prevent multiple identical entries
  });

  // Add to Database
  const createdEntries = await db.models.targetedGenes.bulkCreate(entries);
  logger.info('Finished Targeted Gene Report.');

  return createdEntries;
};
