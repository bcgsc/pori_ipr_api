const fs = require('fs');
const glob = require('glob');
const parse = require('csv-parse/lib/sync');
const nconf = require('nconf').argv().env().file({file: './config/columnMaps.json'});
const db = require('../../models');
const remapKeys = require('../../libs/remapKeys');

const logger = require('../../log');

/**
 * Load Mutation Signature file and parse into database
 *
 * @param {object} report - The report the mutation signatures belong to
 * @param {object} baseDir - Base directory
 * @param {object} options - Location of mutation signature folder
 * @returns {Promise.<object>} - Returns an object with successfull load info
 */
module.exports = async (report, baseDir, options = {}) => {
  // Find File
  const files = glob.sync(`${options.config.mutationSigFolder}/*_msig_combined.txt`);

  if (files.length === 0) {
    logger.error(`Unable to find Mutation Signature source file: ${options.config.mutationSigFolder}/*_msig_combined.txt`);
    throw new Error(`Unable to find Mutation Signature source file: ${options.config.mutationSigFolder}/*_msig_combined.txt`);
  }

  // Get File
  const output = fs.readFileSync(files[0]);

  logger.info('Found and read sample_summary.csv file.');

  // Parse file!
  const result = parse(output, {delimiter: '\t', columns: true});

  const entries = remapKeys(result, nconf.get('somaticMutations:mutationSignature'));

  // Loop over entries
  entries.forEach((value) => {
    value.pog_id = report.pog_id;
    value.pog_report_id = report.id;
    value.signature = value.signature.match(/[0-9]{1,2}/g)[0];
  });

  // Add to Database
  const mutSigCreate = await db.models.mutationSignature.bulkCreate(entries);
  logger.info('Mutation Signatures successfully created.');
  return {
    result: true,
    db: mutSigCreate,
    data: entries,
    message: 'Successfully loaded mutation signatures',
    loader: 'MutationSignature',
  };
};
