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
 * Parse Genomic Alterations Identified File
 *
 * 
 * @param object POG - POG model object
 *
 */
module.exports = (POG, dir, logger) => {
  
  // Create promise
  let deferred = Q.defer();
  
  // Setup Logger
  let log = logger.loader(POG.POGID, 'Summary.GenomicAlterationsIdentified');
  
  // First parse in therapeutic
  let output = fs.createReadStream(dir + '/JReport_CSV_ODF/genomic_alt_identified.csv')
  
  log('Found and read genomic_alt_identified.csv file.')
  
  // Parse file!
  let parser = parse({delimiter: ','},
    (err, result) => {
      
      // Was there a problem processing the file?
      if(err) {
        log('Unable to parse CSV file');
        console.log(err);
        deferred.reject({reason: 'parseCSVFail'});
      }
    
      // Create Entries Array
      let entries = [];
      
      // Remove First Row
      _.pullAt(result, 0);
      
      // Loop over returned rows, and read in each column value
      _.flatten(result).forEach((value) => {
        
        // Check for empty value
        if(value !== '') {
          entries.push({
            pog_id: POG.id,
            geneVariant: value
          });
        }
        
      });
      
      // Add to Database
      db.models.genomicAlterationsIdentified.bulkCreate(entries).then(
        (result) => {
          log('Finished Genomic Alterations Identified.', logger.SUCCESS)
         
          // Resolve Promise
          deferred.resolve(result);
        },
        (err) => {
          console.log(err);
          log('Failed to load patient tumour analysis.', logger.ERROR)
          deferred.reject('Failed to load Genomic Alterations Identified.');
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
