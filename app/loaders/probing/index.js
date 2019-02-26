/*
 * Loaders - Onboards CSV data into SQL databases
 *
 * Recursively works back g
 *
 */
const glob = require('glob');
const nconf = require('nconf').file({file: `${__dirname}/../../../config/${process.env.NODE_ENV}.json`});

const summaryPatientInformation = require('../summary/patientInformation');
const summaryGenomicEventsTherapeutic = require('../summary/genomicEventsTherapeutic');
const sampleInformation = require('../POG');
const testInformation = require('./test_information');
const alterations = require('../detailedGenomicAnalysis/alterations');
const approvedThisCancer = require('../detailedGenomicAnalysis/approvedThisCancer');
const approvedOtherCancer = require('../detailedGenomicAnalysis/approvedOtherCancer');

const config = nconf.get('paths:data');
const {logger} = process;

// Map of loaders
const LOADERS = [
  {name: 'summary_patientInformation', required: true, location: '/../summary/patientInformation', loaderType: 'class'},
  {name: 'summary_genomicEventsTherapeutic', required: true, location: '/../summary/genomicEventsTherapeutic'},
  {name: 'sample_information', required: true, location: '/../POG'},
  {name: 'test_information', required: true, location: '/test_information'},
  {name: 'alterations', required: true, location: '/../detailedGenomicAnalysis/alterations'},
  {name: 'approved_thisCancer', required: true, location: '/../detailedGenomicAnalysis/approvedThisCancer'},
  {name: 'approved_otherCancer', required: true, location: '/../detailedGenomicAnalysis/approvedOtherCancer'},
];

class ProbeLoader {
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
   * @returns {Promise|array} - Returns collection of loader results
   */
  async load() {
    //this.log('Starting Probe Loader');

    // Run default POG Probe Report loading
    if (this.options.profile.toLowerCase() === 'pog_probe' || this.options.profile.toLowerCase() === 'pog_probe_no_flat') {

      if (this.options.profile === 'pog_probe_no_flat') {
        this.log('Running POG Probe Loader without flatfile');

        // Skip patient info loader if no flatfile is available
        _.remove(loaders, { name: 'summary_patientInformation' });
      } else {
        this.log('Running POG Probe Loader');
      }

      // If there is a baseDir, run using that dir
      if (this.baseDir !== null) {

        this.log('Base directory provided: ' + this.baseDir, logger.SUCCESS);

        // Run Loaders
        this.runLoaders().then(
          (successLoaders) => {
            resolve(successLoaders);
          },
          // Rejects with load-ending failures.
          (err) => {
            console.log('Unable to finish loaders', err);
            reject(err);
          }
        );
        return;
      }


      this.log('Running default POG Probe loader profile');

      // Run Default Loader Scenario
      this.getLibraryFolder()
        .then(this.getReportFolder.bind(this))
        .then(this.runLoaders.bind(this))
        .then(
          // Resolves with status of loaders
          (successLoaders) => {
            resolve(successLoaders);
          },
          // Rejects with load-ending failures.
          (err) => {
            console.log('Unable to finish loaders', err);
            reject(err);
          }
        )
        .catch((e) => {
          reject({ error: { message: 'A required loader failed: ' + e.message } });
        });
      return;
    }

    // Loader NonPOG Report
    if (this.options.profile === 'nonPOG') {

      // Run Loaders
      this.runLoaders().then(
        (successLoaders) => {
          resolve(successLoaders);
        },
        // Rejects with load-ending failures.
        (err) => {
          reject(err);
        }
      );
      return;
    }

    reject({ error: { message: 'Unable to find loader profile to run' } });
  }

  /**
   * Get the report folder for a POG
   *
   * @throws DirectoryNotFound - If the directory is not found by globbing
   * @returns {Promise} - Resolves with the directory to the latest libraries available
   */
  async getLibraryFolder() {
    logger.info('Attempting to find library directory');

    // Determine which folder/biopsy to go for (grabs oldest by default)
    const files = glob.sync(`${config.probeData}/${this.POG.POGID}/P*`);

    if (files.length === 0) {
      throw new Error('Unable to find the report library folder(s)');
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
   * @returns {Promise|string} - Resolves with the base string to the report directory
   */
  async getReportFolder(libraryDirectory) {
    logger.info('Attempting to find report directory');

    // Go globbing for the report directory
    const files = glob.sync(`${libraryDirectory}/probing_v*/jreport_genomic_summary_v*`);

    logger.info(`Attempting to find: ${libraryDirectory}/probing_v*/jreport_genomic_summary_v*`);

    if (files.length === 0) {
      throw new Error('Unable to find the probe report directory');
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
   * @returns {Promise} - TODO: design this object
   */
  async runLoaders() {
    logger.info('Starting loader execution');

    let promises = []; // Collection of module promises

    // Set loaders to run - if none are specified, load them all.
    const toLoad = (this.options.load) ? this.loaderFilter() : LOADERS;

    toLoad.forEach((loader) => {
      let loaderPromise = null;

      // Check for Module Options
      const moduleOptions = this.moduleOptions[loader.name] || {};
      moduleOptions.library = this.libraries[0];

      const l = loader.location;

      // Check for new class designed loader
      if (loader.loaderType === 'class') {
        let classLoader = new loader.location(this.report, this.baseDir, moduleOptions);
        loaderPromise = classLoader.load();
      } else {
        // Standard function designed loader
        loaderPromise = l(this.report, this.baseDir, moduleOptions);
      }

      promises.push(loaderPromise);
    });

    // // Loop over loader files and create promises
    // _.forEach(toLoad, (loader) => {
    //   // If the looped loader exists in the toLoad intersection, queue the promise!
    //   let loaderPromise = null;
    //   let l = require(__dirname + loader.location);

    //   // Check for Module Options
    //   let moduleOptions = this.moduleOptions[loader.name] || {};
    //   moduleOptions.library = this.libraries[0];

    //   // Check for new class designed loader
    //   if (loader.loaderType === 'class') {
    //     let classLoader = new l(this.report, this.baseDir, logger, moduleOptions);
    //     loaderPromise = classLoader.load();
    //   } else {
    //     // Standard function designed loader
    //     loaderPromise = l(this.report, this.baseDir, logger, moduleOptions);
    //   }

    //   promises.push(loaderPromise);
    // });

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
    return LOADERS.filter((loader) => {
      return this.options.load.includes(loader.name);
    });
  }
}

module.exports = ProbeLoader;
