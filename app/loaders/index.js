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

// Load config into memory
const config = nconf.get('paths:data');

// Map of loaders
let loaders = {
  // Meta
  meta: './POG',
  image: './image',

  // Summary
  summary_patientInformation: 'summary/patientInformation',
  summary_tumourAnalysis: 'summary/tumourAnalysis',
  summary_mutationSummary: 'summary/mutationSummary',
  summary_variantCounts: 'summary/variantCounts',
  summary_genomicAlterationsIdentified: 'summary/genomicAlterationsIdentified',
  summary_genomicEventsTherapeutic: 'summary/genomicEventsTherapeutic',
  summary_probeTarget: 'summary/probeTarget',

  // Detailed Genomic Analysis
  detailed_alterations: 'detailedGenomicAnalysis/alterations',
  detailed_approvedThisCancer: 'detailedGenomicAnalysis/approvedThisCancer',
  detailed_approvedOtherCancer: 'detailedGenomicAnalysis/approvedOtherCancer',
  detailed_targetedGenes: 'detailedGenomicAnalysis/targetedGenes',

  // Somatic Mutations
  somatic_smallMutations: 'somaticMutations/smallMutations',
  somatic_mutationSignature: 'somaticMutations/mutationSignature',

  // Copy Number Analyses
  copynumber_cnv: 'copyNumberAnalysis/cnv',

  // Structural Variation
  structural_sv: 'structuralVariation/sv',

  // Expression Analysis
  expression_outlier: 'expressionAnalysis/outlier',
  expression_drugTarget: 'expressionAnalysis/drugTarget',

};

/**
 * Run POG Report onboarding process.
 *
 * Runs specified loads to onboard POG JReport data into API database
 *
 * @param {object} POG - POG Model instance
 * @param {object} report - POG Report model instance
 * @param {object} options - Key-value pair options object
 * @returns {*|promise} - TODO: resolve design
 */
module.exports = (POG, report, options={}) => {

  let log = logger.loader(POG.POGID + '-' + report.ident);

  // Started to onboard a POG Report
  log('Starting POG data onboard into InteractiveReportAPI.');

  let deferred = Q.defer(); // Create promise

  // Determine which folder/biopsy to go for (grabs oldest by default)
  glob(config.POGdata + '/' + POG.POGID + '/P*', (err, files) => {

    // Explode out and get biggest
    let libraryOptions = [];
    _.forEach(files, (f) => {
      let t = f.split('/');
      libraryOptions.push(t[t.length-1]);
    });
    libraryOptions.sort().reverse();

    let dir = config.POGdata + '/' + POG.POGID + '/' + libraryOptions[0];

    glob(config.POGdata + '/' + POG.POGID + '/' + libraryOptions[0] + '/jreport_genomic_summary_v*', (err, files) => {

      // Explode out and get biggest
      let versionOptions = [];
      _.forEach(files, (f) => {
        let t = f.split('/');
        versionOptions.push(t[t.length-1]);
      });

      // Sort by largest value (newest version)
      versionOptions.sort().reverse();

      if(err) deferred.reject('Unable to find POG sources.');
      let baseDir = config.POGdata + '/' + POG.POGID + '/' + libraryOptions[0] + '/' + versionOptions[0] + '/report';
      let promises = []; // Collection of module promises

      // Log Base Path for Source
      log('Source path: '+baseDir);

      // Set loaders to run - if none are specified, load them all.
      let toLoad = (options.load) ? _.intersection(_.keys(loaders), options.load) : _.keys(loaders);

      // Loop over loader files and create promises
      _.forEach(loaders, (file, k) => {

        // Check for options


        // If the looped loader exists in the toLoad intersection, queue the promise!
        if(toLoad.indexOf(k) > -1) promises.push(require('./' + file)(report, baseDir, logger, {library: libraryOptions[0]}));

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
