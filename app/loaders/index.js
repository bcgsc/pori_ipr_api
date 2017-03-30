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
    eventEmitter = require('events'),
    nconf = require('nconf').argv().env().file({file: process.cwd() + '/config/'+process.env.NODE_ENV+'.json'});

// Map of loaders
let loaders = [
  // Meta
  './POG',
  './image',

  // Summary
  'summary/patientInformation',
  'summary/tumourAnalysis',
  'summary/mutationSummary',
  'summary/variantCounts',
  'summary/genomicAlterationsIdentified',
  'summary/genomicEventsTherapeutic',
  'summary/probeTarget',

  // Detailed Genomic Analysis
  'detailedGenomicAnalysis/alterations',
  'detailedGenomicAnalysis/approvedThisCancer',
  'detailedGenomicAnalysis/approvedOtherCancer',
  'detailedGenomicAnalysis/targetedGenes',

  // Somatic Mutations
  'somaticMutations/smallMutations',
  'somaticMutations/mutationSignature',

  // Copy Number Analyses
  'copyNumberAnalysis/cnv',

  // Structural Variation
  'structuralVariation/sv',

  // Expression Analysis
  'expressionAnalysis/outlier',
  'expressionAnalysis/drugTarget',
  
];

// Run loaders for a specified POGID
module.exports = (POG, options={}) => {

  let log = logger.loader(POG.POGID);

  // Started to onboard a POG Report
  log('Starting POG data onboard into InteractiveReportAPI.');

  let deferred = Q.defer(); // Create promise

  // Determine location to report base folder
  glob(nconf.get('paths:data:POGdata') + '/' + POG.POGID + nconf.get('paths:data:dataDir'), (err, files) => {

    if(err) deferred.reject('Unable to find POG sources.');
    let baseDir = files[0];
    let promises = []; // Collection of module promises

    // Log Base Path for Source
    log('Source path: '+baseDir);

    // Loop over loader files and create promises
    loaders.forEach((file) => {
      promises.push(require('./' + file)(POG, baseDir, logger));
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

        /*
        // Remove all entries for failed POG loading
        _.forEach(db.models, (model) => {

          model.destroy()

        }); */

        // Log error
        log('Failed onboarding process.', logger.ERROR);
        console.log(error);

        if(error.reason && error.reason.indexOf('sourceFileNotFound') !== -1) fail.status = 400; // Bad POG source

        // Return fail
        deferred.reject(fail);
      }
    );


  });

  return deferred.promise;

}
