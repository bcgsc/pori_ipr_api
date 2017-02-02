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
 * Parse Genomic Events With Potential Clinical Association File
 *
 * 
 * @param object POG - POG model object
 *
 */
module.exports = (POG, logger) => {
  
  // Create promise
  let deferred = Q.defer();
  
  // Setup Logger
  let log = logger.loader(POG.POGID, 'Summary.GenomicEventsTherapeutic');
  
  // First parse in therapeutic
  let output = fs.createReadStream(nconf.get('paths:data:POGdata') + '/' + POG.POGID + '/JReport/Genomic/JReport_CSV_ODF/genomic_events_thera_assoc.csv')
  
  log('Found and read genomic_events_thera_assoc.csv file.')
  
  // Parse file!
  let parser = parse({delimiter: ',', columns: true},
    (err, result) => {
      
      // Was there a problem processing the file?
      if(err) {
        log('Unable to parse CSV file');
        console.log(err);
        deferred.reject({reason: 'parseCSVFail'});
      }
    
      // Create Entries Array
      let entries = remapKeys(result, nconf.get('columnMapping:summary:genomicEventsTherapeutic'));
      
      // Loop over returned rows, and read in each column value
      _.forEach(result, (v, k) => {
          entries[k].pog_id = POG.id
      });
      
      // Add to Database
      db.models.genomicEventsTherapeutic.bulkCreate(entries).then(
        (result) => {
          log('Finished Genomic Events With Therapeutic Association.', logger.SUCCESS)
         
          // Resolve Promise
          deferred.resolve(result);
        },
        (err) => {
          log('Failed to load patient genomic events with therapeutic association.', logger.ERROR)
          deferred.reject('Failed to load Genomic Events With Therapeutic Association.');
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
