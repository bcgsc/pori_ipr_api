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
  nconf = require('nconf').argv().env().file({file: process.cwd() + '/config/'+process.env.NODE_ENV+'.json'});

// Map of loaders
let loaders = {

  // Probe Report Loaders
  alterations_identified: '/../summary/genomicEventsTherapeutic',
  alterations: '/../detailedGenomicAnalysis/alterations',
  sample_information: '/../POG',
  test_information: '/test_information',
  approved_thisCancer: '/../detailedGenomicAnalysis/approvedThisCancer',
  approved_otherCancer: '/../detailedGenomicAnalysis/approvedOtherCancer',

};

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
  glob(nconf.get('paths:data:probeData') + '/' + POG.POGID + '/P*', (err, files) => {

    // Explode out and get biggest
    let libraryOptions = [];
    _.forEach(files, (f) => {
      let t = f.split('/');
      libraryOptions.push(t[t.length-1]);
    });
    libraryOptions.sort().reverse();

    glob(nconf.get('paths:data:probeData') + '/' + POG.POGID + '/' + libraryOptions[0] + '/probing_v*/jreport_genomic_summary_v*', (err, files) => {

      // Explode out and get biggest
      let versionOptions = [];
      _.forEach(files, (f) => {
        let t = f.split('/'); // Split by path
        versionOptions.push({report: t[t.length-1], probe: t[t.length-2]}); // Get report version
      });

      // Sort by largest value (newest version)
      versionOptions.sort().reverse();

      if(err) deferred.reject('Unable to find POG sources.');
      let baseDir = nconf.get('paths:data:probeData') + '/' + POG.POGID + '/' + libraryOptions[0] + '/' + versionOptions[0].probe + '/' + versionOptions[0].report;
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
