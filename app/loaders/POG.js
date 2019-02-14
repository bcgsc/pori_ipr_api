const util = require('util');
const fs = require('fs');
const glob = require('glob');
const readFile = util.promisify(require('pyconf').readFile);
const parse = require('csv-parse/lib/sync');
const db = require('../models');

const {logger} = process;

// Get Sample Info
const getInfo = async (dir, file) => {
  // Read in file
  const output = fs.readFileSync(`${dir}/JReport_CSV_ODF/${file}`);
  logger.info(`Found and read ${file} file.`);

  // Parse file!
  const result = parse(output, {delimiter: ',', columns: true});
  return result;
};

/**
 * Parse Patient Information File
 *
 * @param {object} report - POG report model object
 * @param {string} dir - base directory
 *
 * @returns {Promise.<object>} - Returns an object with property pogSampleQC set to true
 */
module.exports = async (report, dir) => {
  const pogInfo = {};

  // Wait for promises
  const results = await Promise.all([
    getInfo(dir, 'sample_info.csv'),
    getInfo(dir, 'qc_summary.csv'),
  ]);

  logger.info('Finished reading Sample, QC & Config File', logger.SUCCESS);

  // Pull and process results
  pogInfo.sampleInfo = results[0];
  pogInfo.seqQC = results[1];

  const files = glob.sync(`${dir}/Report_tracking.c*`);

  // Did we find it?
  if (files.length === 0) {
    logger.error('Unable to find report config file.');
    throw new Error('Unable to find report config file');
  }

  const conf = await readFile(files[0]);

  // Read config file
  logger.info('Read in config file');
  pogInfo.config = conf.__lines.join('\r\n');

  // Get Version Numbers
  pogInfo.kbVersion = conf.KnowledgebaseModuleVersion;
  pogInfo.reportVersion = conf.programVersion;

  // Add to Database
  await db.models.analysis_report.update(pogInfo, {where: {id: report.id}});
  logger.info('POG Sample & QC information loaded.');
  return {pogSampleQC: true};
};
