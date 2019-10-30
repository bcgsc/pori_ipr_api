const glob = require('glob');
const nconf = require('../../config');

const summaryPatientInformation = require('../summary/patientInformation');
const summaryGenomicEventsTherapeutic = require('../summary/genomicEventsTherapeutic');
const sampleInformation = require('../POG');
const testInformation = require('./test_information');
const alterations = require('../detailedGenomicAnalysis/alterations');
const approvedThisCancer = require('../detailedGenomicAnalysis/approvedThisCancer');
const approvedOtherCancer = require('../detailedGenomicAnalysis/approvedOtherCancer');

const config = nconf.get('paths:data');
const logger = require('../../log');

// Map of loaders
let loaders = [
  {name: 'summary_patientInformation', required: true, location: summaryPatientInformation, loaderType: 'class'},
  {name: 'summary_genomicEventsTherapeutic', required: true, location: summaryGenomicEventsTherapeutic},
  {name: 'sample_information', required: true, location: sampleInformation},
  {name: 'test_information', required: true, location: testInformation},
  {name: 'alterations', required: true, location: alterations},
  {name: 'approved_thisCancer', required: true, location: approvedThisCancer},
  {name: 'approved_otherCancer', required: true, location: approvedOtherCancer},
];

class ProbeLoader {
  /**
   * Loads Probe Data - Onboards CSV data into SQL databases
   *
   * @param {object} POG - POG object model
   * @param {object} report - Report object model
   * @param {object} options - Loader options
   */
  constructor(POG, report, options) {
    this.POG = POG;
    this.report = report;
    this.options = options;
    this.libraries = options.libraries || [];
    this.baseDir = options.baseDir || null;
    this.moduleOptions = options.moduleOptions || {};
  }

  /**
   * Run loaders
   *
   * @returns {Promise.<Array.<object>>} - Returns collection of loader results
   */
  async load() {
    logger.info('Starting Probe Loader');

    // Run default POG Probe Report loading
    if (['pog_probe', 'pog_probe_no_flat'].includes(this.options.profile.toLowerCase())) {
      if (this.options.profile === 'pog_probe_no_flat') {
        logger.info('Running POG Probe Loader without flatfile');

        // Skip patient info loader if no flatfile is available
        loaders = loaders.filter((loader) => {
          return loader.name !== 'summary_patientInformation';
        });
      } else {
        logger.info('Running POG Probe Loader');
      }

      // If there is a baseDir, run using that dir
      if (this.baseDir) {
        logger.info(`Base directory provided: ${this.baseDir}`);
      } else {
        logger.info('Running default POG Probe loader profile');

        // Run Default Loader Scenario
        const libFolder = await this.getLibraryFolder();
        await this.getReportFolder(libFolder);
      }

      return this.runLoaders();
    }

    // Loader NonPOG Report
    if (this.options.profile === 'nonPOG') {
      return this.runLoaders();
    }

    throw new Error(`Unable to find loader profile to run ${this.options.profile}`);
  }

  /**
   * Get the report folder for a POG
   *
   * @throws DirectoryNotFound - If the directory is not found by globbing
   *
   * @returns {Promise.<string>} - Returns the directory to the latest libraries available
   */
  async getLibraryFolder() {
    logger.info('Attempting to find library directory');

    // Determine which folder/biopsy to go for (grabs oldest by default)
    const files = glob.sync(`${config.probeData}/${this.POG.POGID}/P*`);

    if (files.length === 0) {
      throw new Error(`Unable to find the report library folder(s) in ${config.probeData}/${this.POG.POGID}`);
    }

    // Explode out and get biggest
    files.forEach((file) => {
      this.libraries.push(file.split('/').pop());
    });
    this.libraries.sort().reverse();

    const dir = `${config.probeData}/${this.POG.POGID}/${this.libraries[0]}`;

    logger.info(`Detected and using libraries: ${this.libraries[0]}`);

    return dir;
  }

  /**
   * Find the reports folder and select latest
   *
   * @throws DirectoryNotFound - If the report folder is not found
   * @param {string} libraryDirectory - The library directory to search for a report directory in
   *
   * @returns {Promise.<string>} - Returns the base report directory
   */
  async getReportFolder(libraryDirectory) {
    logger.info('Attempting to find report directory');

    // Go globbing for the report directory
    const files = glob.sync(`${libraryDirectory}/probing_v*/jreport_genomic_summary_v*`);

    logger.info(`Attempting to find: ${libraryDirectory}/probing_v*/jreport_genomic_summary_v*`);

    if (files.length === 0) {
      throw new Error(`Unable to find the probe reports in the directory ${libraryDirectory}`);
    }

    // Explode out and get biggest
    const versionOptions = files.map((file) => {
      const arr = file.split('/');
      const lastVersion = arr.pop();
      const secondLastVersion = arr.pop();
      return `${secondLastVersion}/${lastVersion}`;
    });

    // Sort by largest value (newest version)
    versionOptions.sort();

    this.baseDir = `${config.probeData}/${this.POG.POGID}/${this.libraries[0]}/${versionOptions.pop()}`;

    // Log Base Path for Source
    logger.info(`Source path: ${this.baseDir}`);

    return this.baseDir;
  }


  /**
   * Execute the loaders
   *
   * @returns {Promise.<object>} - Returns all the created loaders
   */
  async runLoaders() {
    logger.info('Starting loader execution');

    // Set loaders to run - if none are specified, load them all.
    const toLoad = (this.options.load) ? this.loaderFilter() : loaders;

    const promises = toLoad.map((loader) => {
      let loaderPromise = null;
      const {name, location, loaderType} = loader;

      // Check for Module Options
      const moduleOptions = this.moduleOptions[name] || {};
      moduleOptions.library = this.libraries[0];

      // Check for new class designed loader
      if (loaderType === 'class') {
        loaderPromise = new location(this.report, this.baseDir, moduleOptions).load();
      } else {
        loaderPromise = location(this.report, this.baseDir, moduleOptions);
      }

      return loaderPromise;
    });

    const result = Promise.all(promises);
    logger.info('All loaders have completed.');
    return result;
  }


  /**
   * Return a collection of loaders to execute
   *
   * @returns {array} - Returns a collection of loaders
   */
  loaderFilter() {
    return loaders.filter((loader) => {
      return this.options.load.includes(loader.name);
    });
  }
}

module.exports = ProbeLoader;
