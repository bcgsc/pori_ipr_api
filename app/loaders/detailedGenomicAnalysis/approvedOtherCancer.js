"use strict";

// Dependencies
let db = require(process.cwd() + '/app/models'),
    fs = require('fs'),
    parse = require('csv-parse'),
    remapKeys = require(process.cwd() + '/app/libs/remapKeys'),
    _ = require('lodash'),
    Q = require('q'),
    nconf = require('nconf').argv().env().file({file: process.cwd() + '/config/columnMaps.json'});

/**
 * Parse Approved Therapries in Other Cancer File
 * 
 * @param {object} report - POG model object
 * @param {string} dir - POG model object
 * @param {object} logger - /app/libs/logger instance
 * @param {object} options
 *
 */
module.exports = (report, dir, logger, options) => {
  
  // Create promise
  let deferred = Q.defer();
  
  // Create Logger
  let log = logger.loader(report.ident, 'DGA.ApprovedOtherCancer');
  
  // First parse in therapeutic
  let output = fs.createReadStream(dir + '/JReport_CSV_ODF/approved_other_cancer_type_detailed.csv', {'delimiter': ','});
  
  // Parse file!
  let parser = parse({delimiter: ',', columns: true},
    (err, result) => {
      
      // Was there a problem processing the file?
      if(err) {
        log('Unable to parse CSV file');
        console.log(err);
        deferred.reject({loader: 'approvedOtherCancer', message: 'unable to parse CSV file: ' + dir + '/JReport_CSV_ODF/approved_other_cancer_type_detailed.csv', result: false});
      }
    
      // Remap results
      let entries = remapKeys(result, nconf.get('detailedGenomicAnalysis:alterations'));
      
      // Add new values for DB
      entries.forEach((v, k) => {
        // Map needed DB column values
        entries[k].pog_id = report.pog_id;
        entries[k].pog_report_id = report.id;
        entries[k].alterationType = 'therapeutic';
        entries[k].approvedTherapy = 'otherCancer';
        entries[k].newEntry = false;
        if(report.type === 'probe') entries[k].reportType = 'probe';
        if(report.type === 'probe') entries[k].report = 'probe';
      });
      
      // Log progress
      log('Parsed .csv for: approved_other_cancer_type_detailed.csv');
            
      db.models.alterations.bulkCreate(entries).then(
        (result) => {
          
          // Successfull create into DB
          log('Database entries created.', logger.SUCCESS);
          
          // Done!
          deferred.resolve({module: 'approvedOtherCancer', result: true});
          
        },
        // Problem creating DB entries
        (err) => {
          console.log(err);
          log('Unable to create database entries.', logger.ERROR);
          new Error('Unable to create approved other cancer type detailed database entries.');
          deferred.reject({module: 'approvedOtherCancer', result: false, message: 'Unable to create approved other cancer type detailed database entries.'});
        }
      );
      
    }
  );
  
  // Pipe file through parser
  output.pipe(parser);
  
  output.on('error', (err) => {
    log('Unable to find required CSV file');
    deferred.reject({module: 'approvedOtherCancer', message: 'Unable to find the CSV file: ' + dir + '/JReport_CSV_ODF/approved_other_cancer_type_detailed.csv'});
  });
  
  return deferred.promise;
  
}
