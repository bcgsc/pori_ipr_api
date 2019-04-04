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
 * Get Sample Summary Details and Append to Patient Information
 *
 * !!! Called within Patient Information.
 * 
 * @param object POG - POG model object
 *
 */
module.exports = (report, dir, logger) => {

  // Create promise
  let deferred = Q.defer();
  
  // Read in file
  let output = fs.createReadStream(dir + '/JReport_CSV_ODF/sample_summary.csv');
  
  // Setup Logger
  let log = logger.loader(report.ident, 'Summary.SampleSummary');

  
  log('Found and read sample_summary.csv file.');
  
  // Parse file!
  let parser = parse({delimiter: ',', columns: true},
    (err, result) => {
      
      // Was there a problem processing the file?
      if(err) {
        log('Unable to parse CSV file', logger.ERROR);
        console.log(err);
        deferred.reject({loader: 'sampleSummary', message: 'Unable to parse the source file: ' + dir + '/JReport_CSV_ODF/sample_summary.csv'});
      }
      
      if(result.length > 1) return new Error('['+report.ident+'][Loader][Summary.SampleSummary] More than one sample summary entry found.');
    
      // create update
      let entry = {
        tumourSample: result[0].tumour_sample,
        tumourProtocol: result[0].tumour_protocol,
        constitutionalSample: result[0].constitutional_sample,
        constitutionalProtocol: result[0].constitutional_protocol
      };
      
      
      // Add to Database
      db.models.patientInformation.update(entry, {where: {pog_id: report.pog_id}, limit: 1}).then(
        (result) => {

          log('Sample Summary appended.', logger.SUCCESS);
         
          // Resolve Promise
          deferred.resolve({data: entry, result: true, loader: 'sampleSummary'});
        },
        (err) => {
          log('Failed to append Sample Summary.',logger.ERROR)
        }
      );
    }
  );
  
  // Pipe file through parser
  output.pipe(parser);
  
  output.on('error', (err) => {
    log('Unable to find required CSV file');
    deferred.reject({loader: 'sampleSummary', message: 'Unable to find the source file: ' + dir + '/JReport_CSV_ODF/sample_summary.csv', result: false});
  });
  
  return deferred.promise;
  
}
