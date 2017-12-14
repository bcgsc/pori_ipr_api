"use strict";
/*
 * Loaders - Onboards CSV data into SQL databases
 *
 * Recursively works back g
 *
 */

const db = require(process.cwd() + '/app/models'),
  Q = require('q'),
  logger = require(process.cwd() + '/app/libs/logger'),
  glob = require('glob'),
  _ = require('lodash'),
  fs = require('fs'),
  nconf = require('nconf').file({file: __dirname + '/../../../config/'+process.env.NODE_ENV+'.json'});

const config = nconf.get('paths:data');

// Map of loaders
let loaders = [
  { name: 'summary_patientInformation', required: true, location: '/../summary/patientInformation', loaderType: 'class' },
  { name: 'summary_genomicEventsTherapeutic', required: true, location: '/../summary/genomicEventsTherapeutic' },
  { name: 'sample_information', required: true, location: '/../POG' },
  { name: 'test_information', required: true, location: '/test_information' },
  { name: 'alterations', required: true, location:  '/../detailedGenomicAnalysis/alterations' },
  { name: 'approved_thisCancer', required: true, location: '/../detailedGenomicAnalysis/approvedThisCancer' },
  { name: 'approved_otherCancer', required: true, location: '/../detailedGenomicAnalysis/approvedOtherCancer' }
];



class DirectoryNotFound extends Error {

  constructor(m) {
    super(m);
  }
}


class ProbeLoader {

  constructor(POG, report, options) {

    this.POG = POG;
    this.report = report;
    this.options = options;
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

      this.log('Starting Probe Loader');

      // Run default POG Genomic Report loading
      if(this.options.profile.toLowerCase() === 'pog_probe') {

        this.log('Running POG Probe Loader');

        // If there is a baseDir, run using that dir
        if(this.baseDir !== null) {

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
            reject({error: {message: 'A required loader failed: ' + e.message}});
          });
        return;
      }

      // Loader NonPOG Report
      if(this.options.profile === 'nonPOG') {

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
    return new Promise((resolve, reject) => {

      this.log('Attempting to find library directory');

      // Determine which folder/biopsy to go for (grabs oldest by default)
      glob(config.probeData + '/' + this.POG.POGID + '/P*', (err, files) => {

        if(files.length === 0) throw new DirectoryNotFound('Unable to find the report library folder(s)');

        // Explode out and get biggest
        _.forEach(files, (f) => {
          let t = f.split('/');
          this.libraries.push(t[t.length-1]);
        });
        this.libraries.sort().reverse();

        let dir = config.probeData + '/' + this.POG.POGID + '/' + this.libraries[0];

        this.log('Detected and using libraries: ' + this.libraries[0], logger.SUCCESS + ' in ' + dir);

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
      glob(libraryDirectory + '/probing_v*/jreport_genomic_summary_v*', (err, files) => {

        console.log('Attempting to find', libraryDirectory + '/probing_v*/jreport_genomic_summary_v*');

        if(err || files.length === 0) throw new DirectoryNotFound('Unable to find the probe report directory');

        // Explode out and get biggest
        let versionOptions = [];
        _.forEach(files, (f) => {
          let t = f.split('/');
          versionOptions.push( t[t.length-2] + '/' + t[t.length - 1]);
        });

        // Sort by largest value (newest version)
        versionOptions.sort().reverse();

        if (err) reject('Unable to find POG sources.');
        this.baseDir = config.probeData + '/' + this.POG.POGID + '/' + this.libraries[0] + '/' + versionOptions[0];

        // Log Base Path for Source
        this.log('Source path: ' + this.baseDir, logger.SUCCESS);

        resolve(this.baseDir);
      });
    });
  }


  /**
   * Execute the loaders
   *
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
            // A loader failed
            let fail = {};

            // TODO: fail better

            // Log error
            this.log('Failed onboarding process.', logger.ERROR);
            console.log(error);

            if(error.reason && error.reason.indexOf('sourceFileNotFound') !== -1) fail.status = 400; // Bad POG source

            // Return fail
            reject(fail);
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

}

module.exports = ProbeLoader;



/**
 * Run POG Probe Report onboarding process.
 *
 * Runs specified loads to onboard POG JReport data into API database
 *
 * @param {object} POG - POG Model instance
 * @param {object} report - POG Report model instance
 * @param {object} options - Key-value pair options object
 * @returns {*|promise} - TODO: resolve design
 */

/*
module.exports = (POG, report, options={}) => {

  // Extend options with default values
  if(!options.loader) options.loader = {};
  options.loader.alterations =  {report: 'probe'};
  options.loader.alterations_identified = {report: 'probe'};
  options.loader.approved_thisCancer = {report: 'probe'};
  options.loader.approved_otherCancer = {report: 'probe'};

  let log = logger.loader(POG.POGID + '-' + report.ident);

  // Started to onboard a POG Report
  log('Starting POG Probe data onboard into InteractiveReportAPI.');
  
  let deferred = Q.defer(); // Create promise

  // Determine which folder/biopsy to go for (grabs oldest by default)
  glob(config.probeData + '/' + POG.POGID + '/P*', (err, files) => {

    // Not able to find any folders...
    if(files.length === 0) {
      log('Failed to glob: ' + config.probeData + '/' + POG.POGID + '/P*', logger.ERROR);
      console.log('Unable to source probe data folder', files);

      deferred.reject({error: {message: 'Unable to source probe data folder'}});

      report.destroy().then(
        () => {
          log('Unable to load probe report, source folder not found. Successfully cleaned up failed load');
        },
        (err) => {
          log('Unable to load probe report, source folder not found. Unable to clean up failed load');
          console.log('SQL error on analysis_report delete', err);
        }
      );

      return; // Stop execution
    }

    // Explode out and get biggest
    let libraryOptions = [];
    _.forEach(files, (f) => {
      let t = f.split('/');
      libraryOptions.push(t[t.length-1]);
    });
    libraryOptions.sort().reverse();

    glob(config.probeData + '/' + POG.POGID + '/' + libraryOptions[0] + '/probing_v* /jreport_genomic_summary_v*', (err, files) => {

      // Not able to find any folders...
      if(files.length === 0) {
        console.log('Unable to source probe jreport data folder', files);
        log('Failed to glob: '+ config.probeData + '/' + POG.POGID + '/' + libraryOptions[0] + '/probing_v* /jreport_genomic_summary_v*');

        deferred.reject({status: false, message: "Unable to load probe report, source folder not found. Successfully cleaned up failed load"});

        report.destroy().then(
          () => {
            log("Unable to load probe report, source folder not found. Successfully cleaned up failed load");
          },
          (err) => {
            console.log('Unable to remove report entry', err);
            log("Unable to load probe report, source folder not found. Unable to clean up failed load", logger.ERROR);
          }
        );
        return; // Stop Execution
      }

      // Explode out and get biggest
      let versionOptions = [];
      _.forEach(files, (f) => {
        let t = f.split('/'); // Split by path
        versionOptions.push({report: t[t.length-1], probe: t[t.length-2]}); // Get report version
      });

      // Sort by largest value (newest version)
      versionOptions.sort().reverse();

      if(err) deferred.reject({error: {message: 'Unable to find POG sources.'}});
      let baseDir = config.probeData + '/' + POG.POGID + '/' + libraryOptions[0] + '/' + versionOptions[0].probe + '/' + versionOptions[0].report;
      let promises = []; // Collection of module promises

      // Log Base Path for Source
      log('Source path: '+baseDir);

      // Set loaders to run - if none are specified, load them all.
      let toLoad = (options.load) ? _.intersection(_.keys(loaders), options.load) : _.keys(loaders);

      // Loop over loader files and create promises
      _.forEach(loaders, (file, k) => {
        // Create empty options object
        let opts = {};
        // Check for passed options
        if(options.loader && options.loader[k]) {
          opts = options.loader[k];
        }

        // If the looped loader exists in the toLoad intersection, queue the promise!
        if(toLoad.indexOf(k) > -1) promises.push(require(__dirname + file)(report, baseDir, logger, opts));

      });

      // Wait for all loaders to finish!
      Q.all(promises)
        .done((result) => {

            // Check Results
            log('All loaders have completed.', logger.SUCCESS);

            // All good!
            deferred.resolve(true);

          },
          (error) => {
            // A loader failed
            let fail = {};

            // TODO: fail better

            // Log error
            log('Failed onboarding process.', logger.ERROR);
            console.log(error);

            if(error.reason && error.reason.indexOf('sourceFileNotFound') !== -1) fail.status = 400; // Bad POG source

            // Return fail
            deferred.reject(fail);
          }
        );
    });
  });

  return deferred.promise;
};
*/
