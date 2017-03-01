"use strict";

// Dependencies
let db = require(process.cwd() + '/app/models'),
    fs = require('fs'),
    parse = require('csv-parse'),
    remapKeys = require(process.cwd() + '/app/libs/remapKeys'),
    _ = require('lodash'),
    Q = require('q'),
    nconf = require('nconf').argv().env().file({file: process.cwd() + '/config/columnMaps.json'});

/*
 * Parse Patient Information File
 *
 * 
 * @param object POG - POG model object
 *
 */
module.exports = (POG, dir, logger) => {
  
  // Create promise
  let deferred = Q.defer();
  
  // Read in file
  let output = fs.createReadStream(dir + '/JReport_CSV_ODF/patient_info.csv');

  // Setup Logger
  let log = logger.loader(POG.POGID, 'Summary.PatientInformation');
  
  log('Found and read patient_info.csv file.');
  
  // Parse file!
  let parser = parse({delimiter: ',', columns: true},
    (err, result) => {
      
      // Was there a problem processing the file?
      if(err) {
        log('Unable to parse CSV file');
        console.log(err);
        deferred.reject({reason: 'parseCSVFail'});
      }
      
      if(result.length > 1) return new Error('['+POG.POGID+'][Loader][Summary.PatientInformation] More than one patient history entry found.');
    
      // Remap results
      let entry = _.head(remapKeys(result, nconf.get('summary:patientInformation')));
      
      // Map needed DB column values
      entry.pog_id = POG.id;
      
      // Add to Database
      db.models.patientInformation.create(entry).then(
        (result) => {

          log('Patient information loaded.', logger.SUCCESS);
          
          // Call Subloader
          require('./sampleSummary.js')(POG, dir, logger).then(
            (success) => {
              // Resolve Promise
              deferred.resolve(entry);
            },
            (err) => {
              deferred.reject({reason: 'sampleSummaryFailed'});
            }
          );
          
        },
        (err) => {
          log('Failed to load patient history.',logger.ERROR)
        }
      );
    }
  );
  
  // Pipe file through parser
  output.pipe(parser);
  
  output.on('error', (err) => {
    log('Unable to find required CSV file');
    deferred.reject({reason: 'sourceFileNotFound'});
  });
  
  return deferred.promise;
  
}
