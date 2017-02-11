"use strict";

// Dependencies
let db = require(process.cwd() + '/app/models'),
    fs = require('fs'),
    parse = require('csv-parse'),
    remapKeys = require(process.cwd() + '/app/libs/remapKeys'),
    _ = require('lodash'),
    Q = require('q'),
    nconf = require('nconf').argv().env().file({file: process.cwd() + '/config/config.json'});

/*
 * Load Mutation Summary File
 *
 * 
 * @param object POG - POG model object
 *
 */
module.exports = (POG, dir, logger) => {
  
  // Create promise
  let deferred = Q.defer();
  
  // Parsse input file
  let output = fs.createReadStream(dir + '/JReport_CSV_ODF/mutational_spectrum.csv')
  
  // Setup Logger
  let log = logger.loader(POG.POGID, 'Summary.MutationSummary');
  
  log('Found and read mutational_spectrum.csv file.');
  
  // Parse file!
  let parser = parse({delimiter: ',', columns: true},
    (err, result) => {
      
      // Was there a problem processing the file?
      if(err) {
        log('Unable to parse CSV file');
        console.log(err);
        deferred.reject({reason: 'parseCSVFail'});
      }
      
      if(result.length > 1) return new Error('['+POG.POGID+'][Loader][Summary.MutationSummary] More than one mutation summary entry found.');
    
      // Remap results
      let entry = _.head(remapKeys(result, nconf.get('columnMapping:summary:mutation')));
      
      // Map needed DB column values
      entry.pog_id = POG.id;
      
      // Add to Database
      db.models.mutationSummary.create(entry).then(
        (result) => {
          // Done
          log('Patient mutation summary loaded.', logger.SUCCESS);
         
          // Resolve Promise
          deferred.resolve(entry);
        },
        (err) => {
          console.log(err);
          log('Failed to create mutation summary entry.', logger.ERROR);
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
