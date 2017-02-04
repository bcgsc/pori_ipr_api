"use strict";
/*
 * Loaders - Onboards CSV data into SQL databases
 *
 * Recursively works back g
 *
 */

let db = require(process.cwd() + '/app/models'),
    Q = require('q'),
    logger = require(process.cwd() + '/app/libs/logger');

// Map of loaders
let loaders = [
  // Meta
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

  // Copy Number Analysis
  'copyNumberAnalysis/cnv',
];


// Run loaders for a specified POGID
module.exports = (POG, options={}) => {

  let log = logger.loader(POG.POGID);

  // Started to onboard a POG Report
  log('Starting POG data onboard into InteractiveReportAPI.');
  
  let deferred = Q.defer(); // Create promise
  let promises = []; // Collection of module promises
  
  // Loop over loader files and create promises
  loaders.forEach((file) => {
    promises.push(require('./' + file)(POG, logger));
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
      
      // TODO: Cleanup!
      
      // Log error
      log('Failed onboarding process.', logger.ERROR);
      console.log(error);
      
      if(error.reason == 'sourceFileNotFound') fail.status = 400; // Bad POG source
      
      // Return fail
      deferred.reject(fail);
    }
  );
  
  return deferred.promise;
}
