"use strict";
/*
 * Loaders - Onboards CSV data into SQL databases
 *
 * Recursively works back g
 *
 */

let db = require(process.cwd() + '/app/models'),
    Q = require('q'),
    logger = require(process.cwd() + '/app/libs/logger'),
    glob = require('glob'),
    _ = require('lodash'),
    fs = require('fs'),
    pyconf = require('pyconf'),
    nconf = require('nconf').file({file: process.cwd() + '/config/'+process.env.NODE_ENV+'.json'});

// Load config into memory
const config = nconf.get('paths:data');

// Map of Available Loaders
let loaders = [
  // Meta
  { name: 'meta', required: true, location: '/POG'},
  { name: 'image', required: true, location: '/image'},

  // Summary
  { name: 'summary_patientInformation', required: true, location: '/summary/patientInformation', loaderType: 'class' },
  { name: 'summary_tumourAnalysis', required: true, location: '/summary/tumourAnalysis' },
  { name: 'summary_mutationSummary', required: true, location: '/summary/mutationSummary', loaderType: 'class' },
  //{ name: 'summary_mutationSummary', required: true, location: '/summary/mutationSummary'},
  { name: 'summary_variantCounts', required: false, location: '/summary/variantCounts' },
  { name: 'summary_genomicAlterationsIdentified', required: true, location: '/summary/genomicAlterationsIdentified' },
  { name: 'summary_genomicEventsTherapeutic', required: true, location: '/summary/genomicEventsTherapeutic' },
  { name: 'summary_probeTarget', required: false, location: '/summary/probeTarget' },
  { name: 'summary_microbial', required: false, location: '/summary/microbial', loaderType: 'class'  },

  // Detailed Genomic Analysis
  { name: 'detailed_alterations', required: false, location: '/detailedGenomicAnalysis/alterations' },
  { name: 'detailed_approvedThisCancer', required: false, location: '/detailedGenomicAnalysis/approvedThisCancer' },
  { name: 'detailed_approvedOtherCancer', required: false, location: '/detailedGenomicAnalysis/approvedOtherCancer' },
  { name: 'detailed_targetedGenes', required: false, location: '/detailedGenomicAnalysis/targetedGenes' },

  // Somatic Mutations
  { name: 'somatic_smallMutations', required: false, location: '/somaticMutations/smallMutations' },
  { name: 'somatic_mutationSignature', required: false, location: '/somaticMutations/mutationSignature' },

  // Copy Number Analyses
  { name: 'copynumber_cnv', required: false, location: '/copyNumberAnalysis/cnv' },

  // Structural Variation
  { name: 'structural_sv', required: false, location: '/structuralVariation/sv' },

  // Expression Analysis
  { name: 'expression_outlier', required: false, location: '/expressionAnalysis/outlier' },
  { name: 'protein_expression', required: false, location: '/expressionAnalysis/proteinExpression', loaderType: 'class' },
  { name: 'expression_drugTarget', required: false, location: '/expressionAnalysis/drugTarget' },

];

class GenomicLoader {

  constructor(POG, report, options) {

    this.POG = POG;
    this.report = report;
    this.options = options;
    this.config = {};
    this.libraries = options.libraries || [];
    this.baseDir = options.baseDir || null;
    this.moduleOptions = options.moduleOptions || {};
    this.log = logger.loader(POG.POGID + '-' + report.ident);
    
  }

  /**
   * Run loaders
   *
   * @returns {Promise|array} - Returns collection of loader results
   */
  load() {

    return Q.Promise((resolve, reject) => {

      this.log('Starting Genomic Loader');

      // Run default POG Genomic Report loading
      if(this.options.profile === 'pog_genomic') {

        this.log('Running POG Genomic Loader');

        // If there is a baseDir, run using that dir
        if(this.baseDir !== null) {

          // Run Loaders
          this.getConfig()
            .then(this.runLoaders.bind(this))
            .then(
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


        this.log('Running default POG Genomic loader profile');

        // Run Default Loader Scenario
        this.getLibraryFolder()
          .then(this.getReportFolder.bind(this))
          .then(this.getConfig.bind(this))
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
          );
        return;
      }

      // Loader NonPOG Report
      if(this.options.profile !== 'pog_genomic') {

        if(!this.baseDir) {
          this.log('Non-POG no base directory specified', logger.ERROR);
        }

        // Run Loaders
        this.getConfig()
          .then(this.runLoaders.bind(this))
          .then(
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

      reject({error: {message: 'Unable to find loader profile to run'}});
    });
  }

  /**
   * Get the report folder for a POG
   *
   * @throws DirectoryNotFound - If the directory is not found by globbing
   * @returns {Promise} - Resolves with the directory to the latest libraries available
   */
  getLibraryFolder() {
    return Q.Promise((resolve, reject) => {

      this.log('Attempting to find library directory');

      // Determine which folder/biopsy to go for (grabs oldest by default)
      glob(config.POGdata + '/' + this.POG.POGID + '/P*', (err, files) => {

        if(files.length === 0) throw new DirectoryNotFound('Unable to find the report library folder(s)');

        // Explode out and get biggest
        _.forEach(files, (f) => {
          let t = f.split('/');
          this.libraries.push(t[t.length-1]);
        });
        this.libraries.sort().reverse();

        this.log('Detected and using libraries: ' + this.libraries[0], logger.SUCCESS);

        let dir = config.POGdata + '/' + this.POG.POGID + '/' + this.libraries[0];

        resolve(dir);
      });
    });
  }

  /**
   * Find the reports folder and select latest
   *
   * @throws DirectoryNotFound - If the report folder is not found
   * @param {string} libraryDirectory - The library directory to search for a report directory in
   * @returns {Promise|string} - Resolves with the base string to the report directory
   */
  getReportFolder(libraryDirectory) {

    this.log('Attempting to find report directory');

    return Q.Promise((resolve, reject) => {

      // Go globbing for the report directory
      glob(libraryDirectory + '/jreport_genomic_summary_v*', (err, files) => {

        if(err || files.length === 0) throw new DirectoryNotFound('Unable to find the genomic report directory');

        // Explode out and get biggest
        let versionOptions = [];
        _.forEach(files, (f) => {
          let t = f.split('/');
          versionOptions.push(t[t.length - 1]);
        });

        // Sort by largest value (newest version)
        versionOptions.sort().reverse();

        if (err) reject('Unable to find POG sources.');
        this.baseDir = config.POGdata + '/' + this.POG.POGID + '/' + this.libraries[0] + '/' + versionOptions[0] + '/report';

        // Log Base Path for Source
        this.log('Source path: ' + this.baseDir, logger.SUCCESS);

        resolve(this.baseDir);
      });
    });
  }


  /**
   * Execute the loaders
   *
   * @param {string} baseDir - The base directory the loaders need to work in (report root)
   * @returns {Promise} - TODO: design this object
   */
  runLoaders() {

    this.log('Starting loader execution');

    return new Promise((resolve, reject) => {

      let promises = []; // Collection of module promises

      // Set loaders to run - if none are specified, load them all.
      let toLoad = (this.options.load) ? this.loaderFilter() : loaders;

      // Loop over loader files and create promises
      _.forEach(toLoad, (loader) => {
        // If the looped loader exists in the toLoad intersection, queue the promise!
        let loaderPromise = null;
        let l = require(__dirname + loader.location);

        // Check for Module Options
        let moduleOptions = this.moduleOptions[loader.name] || {};
        moduleOptions.library = this.libraries[0];

        // Include report config file in options
        moduleOptions.config = this.config;

        // Check for new class designed loader
        if(loader.loaderType === 'class') {
          let classLoader = new l(this.report, this.baseDir, logger, moduleOptions);
          loaderPromise = classLoader.load();
        } else {
          // Standard function designed loader
          loaderPromise = l(this.report, this.baseDir, logger, moduleOptions);
        }

        promises.push(loaderPromise);
      });

      // Wait for all loaders to finish!
      Q.all(promises)
        .done((result) => {

            // Check Results
            this.log('All loaders have completed.', logger.SUCCESS);

            // All good!
            resolve(result);

          },
          (error) => {
            // A Loader failed
            this.log('Loading process failed', logger.ERROR);
            this.log('A loader failed: ' + error.loader, logger.ERROR);
            this.log('Reason: ' + error.message, logger.ERROR);
            console.log(error);

            reject(error);
          }
        );

    });
  }


  /**
   * Return a collection of loaders to execute
   *
   * @returns {array} - Returns a collection of loaders
   */
  loaderFilter() {

    return _.filter(loaders, (l) => {
      // If the loader's name appears in the target loaders, include in array
      return (this.options.load.indexOf(l.name) > -1);
    });

  }

  /**
   * Get POG Report Config File
   *
   * Retrieve and parse the Report Tracking config file
   *
   */
  getConfig() {

    return new Promise((resolve, reject) => {

      // From the base directory read in the Report_Tracking.cfg file
      fs.readFile(this.baseDir + '/Report_tracking.cfg', 'utf8', (err, data) => {
        if(err) {
          console.log(err);
          // Unable to find config file
          this.log('Unable to find Report_tracking.cfg file', logger.ERROR);
          reject('Unable to find Report_tracking.cfg file');
          return;
        }

        // Parse config file with pyconf
        pyconf.parse(data, (err, config) => {

          if(err) {
            this.log('Unable to parse python report tracking config file', logger.ERROR);
            reject('Unable to parse python report tracking config file');
          }

          this.log('Loaded & parsed Report config file', logger.SUCCESS);

          this.config = config;

          resolve(this.config);

        });
      });
    });
  }

  /**
   * Handle a failed loader scenario
   *
   * If environment is production, allow passage of
   *
   * @param err
   * @returns {Promise}
   */
  LoaderFailed(err) {

    return new Promise((resolve, reject) => {



    });

  }

}

module.exports = GenomicLoader;


class DirectoryNotFound extends Error {

  constructor(m) {
    super(m);
  }
}