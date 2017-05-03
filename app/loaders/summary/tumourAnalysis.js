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
 * Parse Patient Tumour Analysis File
 *
 * 
 * @param object POG - POG model object
 *
 */
module.exports = (report, dir, logger) => {
  
  // Create promise
  let deferred = Q.defer();
  
  // Setup Logger
  let log = logger.loader(report.ident, 'Summary.TumourAnalysis');
  
  // First parse in therapeutic
  let output = fs.createReadStream(dir + '/JReport_CSV_ODF/patient_tumour_analysis.csv');
  
  log('Found and read patient_tumour_analysis.csv file.');
  
  // Parse file!
  let parser = parse({delimiter: ',', columns: true},
    (err, result) => {
      
      // Was there a problem processing the file?
      if(err) {
        log('Unable to parse CSV file');
        console.log(err);
        deferred.reject({reason: 'parseCSVFail'});
      }
      
      if(result.length > 1) return deferred.reject('More than one patient tumour analysis entry found.') && new Error('['+report.ident+'][Loader][Summary.TumourAnalysis] More than one patient tumour analysis entry found.');
    
      // Remap results
      let entry = _.head(remapKeys(result, nconf.get('summary:tumourAnalysis')));
      
      // Map needed DB column values
      entry.pog_id = report.pog_id;
      entry.pog_report_id = report.id;

      // Add to Database
      db.models.tumourAnalysis.create(entry).then(
        (result) => {
          log('Finished Patient tumour analysis.', logger.SUCCESS)
         
          // Resolve Promise
          deferred.resolve(entry);
        },
        (err) => {
          log('Failed to load patient tumour analysis.', logger.ERROR)
          deferred.reject('Failed to load patient tumour analysis.');
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
