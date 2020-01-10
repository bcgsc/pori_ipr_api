const fs = require('fs');
const parse = require('csv-parse/lib/sync');
const nconf = require('nconf').argv().env().file({file: './config/columnMaps.json'});
const db = require('../../models');
const remapKeys = require('../../libs/remapKeys');

const logger = require('../../log');

class MicrobialLoader {
  /**
   * Microbial Data Loader
   *
   * @param {object} report - POG report model object
   * @param {string} dir - Base directory
   */
  constructor(report, dir) {
    this.report = report;
    this.baseDir = dir;
  }

  /**
   * Execute Loader
   *
   * @returns {Promise.<object>} - Returns object with loader completion status
   */
  async load() {
    const entry = await this.retrieveFileEntry();
    await this.insertEntries(entry);
    logger.info('Microbial Data completed.');
    return {name: 'microbial', result: true};
  }

  /**
   * Load microbial data CSV file and parse
   *
   * @returns {Promise.<Array.<object>>} - Returns an array (only 1 row) of microbial data
   */
  async retrieveFileEntry() {
    // Read in file
    const output = fs.readFileSync(`${this.baseDir}/JReport_CSV_ODF/microbial_detection.csv`);

    // Parse file!
    const result = parse(output, {delimiter: ',', columns: true});

    if (result.length > 1) {
      throw new Error(`[${this.report.ident}][Loader][Summary.PatientInformation] More than one microbial data entry found.`);
    }

    return result;
  }


  /**
   * Create new Microbial Data entry
   *
   * @param {Array.<object>} entries - A collection of patient information details (only 1 row expected)
   * @returns {Promise.<Model>} - Returns the new Model instance
   */
  async insertEntries(entries) {
    // Remap results
    const entry = remapKeys(entries, nconf.get('summary:microbial')).shift();

    // Map needed DB column values
    entry.report_id = this.report.id;

    // Add to Database
    const result = await db.models.summary_microbial.create(entry);
    logger.info('Microbial data loaded.');

    return result;
  }
}

module.exports = MicrobialLoader;
