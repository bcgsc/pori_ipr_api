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
 * Load Mutation Summary File
 *
 * 
 * @param object POG - POG model object
 *
 */
module.exports = (report, dir, logger) => {
  
  let required = {
    integer: ['snvPercentileTCGA', 'indelPercentileTCGA', 'svPercentilePOG']
  };
  let validation = true;
  
  // Create promise
  let deferred = Q.defer();
  
  // Parsse input file
  let output = fs.createReadStream(dir + '/JReport_CSV_ODF/mutational_spectrum.csv')
  
  // Setup Logger
  let log = logger.loader(report.ident, 'Summary.MutationSummary');
  
  log('Found and read mutational_spectrum.csv file.');
  
  // Parse file!
  let parser = parse({delimiter: ',', columns: true},
    (err, result) => {
      
      // Was there a problem processing the file?
      if(err) {
        log('Unable to parse CSV file');
        console.log(err);
        deferred.reject({loader: 'mutationSummary', message: 'Unable to parse the source file: ' + dir + '/JReport_CSV_ODF/mutational_spectrum.csv'});
      }
      
      if(result.length > 1) return new Error('['+report.ident+'][Loader][Summary.MutationSummary] More than one mutation summary entry found.');
    
      // Remap results
      let entry = _.head(remapKeys(result, nconf.get('summary:mutation')));
      
      // Ensure we have integers
      _.forEach(entry, (val, col) => {
        if(required.integer.indexOf(col) > -1 && isNaN(parseInt(val))) {
          validation = false;
          deferred.reject({loader: 'mutationSummary', message: 'na values are not allowed. Expecting integers for column: ' + col, source: dir + '/JReport_CSV_ODF/mutational_spectrum.csv'});
          return new Error('['+report.ident+'][Loader][Summary.MutationSummary] na values are not allowed. Expecting integers.');
        }
      });
      
      // Map needed DB column values
      entry.pog_id = report.pog_id;
      entry.pog_report_id = report.id;
      
      if(validation) {
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
            deferred.reject({loader: 'mutationSummary', message: 'Unable to create database entries'});
            log('Failed to create mutation summary entry.', logger.ERROR);
          }
        );
      } else {
        return;
      }
    }
  );
  
  // Pipe file through parser
  output.pipe(parser);
  
  output.on('error', (err) => {
    log('Unable to find required CSV file');
    deferred.reject({loader: 'mutationSummary', message: 'Unable to find the source file: ' + dir + '/JReport_CSV_ODF/mutational_spectrum.csv'});
  });
  
  return deferred.promise;
  
}
