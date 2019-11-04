const fs = require('fs');
const parse = require('csv-parse/lib/sync');
const db = require('../../models');

const logger = require('../../log');

/**
 * Get Sample Summary Details and Append to Patient Information
 *
 * !!! Called within Patient Information.
 *
 * @param {object} report - POG model object
 * @param {string} dir - Base directory
 *
 * @returns {Promise.<object>} - Returns an object with successful update information
 */
module.exports = async (report, dir) => {
  // Read in file
  const output = fs.readFileSync(`${dir}/JReport_CSV_ODF/sample_summary.csv`);

  logger.info('Found and read sample_summary.csv file.');

  // Parse file!
  const result = parse(output, {delimiter: ',', columns: true});

  if (result.length > 1) {
    logger.error(`[${report.ident}][Loader][Summary.SampleSummary] More than one sample summary entry found.`);
    throw new Error(`[${report.ident}][Loader][Summary.SampleSummary] More than one sample summary entry found.`);
  }

  // create update
  const entry = {
    tumourSample: result[0].tumour_sample,
    tumourProtocol: result[0].tumour_protocol,
    constitutionalSample: result[0].constitutional_sample,
    constitutionalProtocol: result[0].constitutional_protocol,
  };

  // Add to Database
  await db.models.patientInformation.update(entry, {
    where: {pog_id: report.pog_id, pog_report_id: report.id},
    individualHooks: true,
    paranoid: true,
    limit: 1,
  });
  logger.info('Sample Summary appended.');

  return {data: entry, result: true, loader: 'sampleSummary'};
};
