const fs = require('fs');
const parse = require('csv-parse/lib/sync');
const nconf = require('nconf').argv().env().file({file: './config/columnMaps.json'});
const db = require('../../models');
const remapKeys = require('../../libs/remapKeys');
const sampleSummary = require('./sampleSummary.js');

const logger = require('../../../lib/log');

class PatientLoader {
  /**
   * Patient Loader extends Genomic Loader
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
    // Check if the patient Information exists yet
    const exists = await this.checkPatientInformationExists();

    // Delete patient info entry if it already exists
    if (exists) {
      logger.info('Patient Information already loaded - overriding.');
      await this.deleteEntry(exists.id);
    }

    // Create new patient info entry
    const entry = await this.retrieveFileEntry();
    await this.insertEntries(entry);
    await this.runSampleSummary();

    logger.info('Patient Information completed.');
    return {name: 'patientInformation', result: true};
  }

  /**
   * Check is a patient information entry exists yet
   *
   * @returns {Promise.<object>} - Returns the found patient information or null
   */
  async checkPatientInformationExists() {
    return db.models.patientInformation.findOne({where: {pog_id: this.report.pog_id, pog_report_id: this.report.id}});
  }

  /**
   * Gets and parses the patient info from patient_info.csv
   *
   * @returns {Promise.<object>} - Returns the parsed patient info
   */
  async retrieveFileEntry() {
    // Read in file
    const output = fs.readFileSync(`${this.baseDir}/JReport_CSV_ODF/patient_info.csv`);

    // Parse file!
    const result = parse(output, {delimiter: ',', columns: true});

    if (result.length > 1) {
      logger.error(`[${this.report.ident}][Loader][Summary.PatientInformation] More than one patient history entry found`);
      throw new Error(`[${this.report.ident}][Loader][Summary.PatientInformation] More than one patient history entry found`);
    }
    return result;
  }


  /**
   * Create new Patient Information entries
   *
   * @param {array} entries - A collection of patient information details (only 1 row expected)
   * @returns {Promise.<Array.<object>>} - Returns the created patient info entries
   */
  async insertEntries(entries) {
    // Remap results
    const entry = remapKeys(entries, nconf.get('summary:patientInformation')).shift();

    // Map needed DB column values
    entry.pog_id = this.report.pog_id;
    entry.pog_report_id = this.report.id;

    // Add to Database
    const result = await db.models.patientInformation.create(entry);
    logger.info('Patient information loaded.');
    return result;
  }

  /**
   * Remove an existing Patient Information entry
   *
   * @param {int} patientId - the id of the row to delete from the patient info table
   * @returns {Promise.<object>} - Returns the destroyed patient info entry
   */
  async deleteEntry(patientId) {
    const result = await db.models.patientInformation.destroy({where: {id: patientId}});
    logger.info('Existing patient entry has been deleted');
    return result;
  }

  /**
   * Run Sample Summary loader
   *
   * @returns {Promise.<object>} - Returns an object of successfull sample summary info
   */
  async runSampleSummary() {
    // Call Subloader
    return sampleSummary(this.report, this.baseDir);
  }
}

module.exports = PatientLoader;
