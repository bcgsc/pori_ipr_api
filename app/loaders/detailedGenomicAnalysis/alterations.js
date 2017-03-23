"use strict";

// Dependencies
let db = require(process.cwd() + '/app/models'),
    fs = require('fs'),
    parse = require('csv-parse'),
    remapKeys = require(process.cwd() + '/app/libs/remapKeys'),
    _ = require('lodash'),
    Q = require('q'),
    nconf = require('nconf').argv().env().file({file: process.cwd() + '/config/columnMaps.json'});

let baseDir;

/*
 * Parse Alterations File
 *
 * 
 * @param object POG - POG model object
 * @param string alterationFile - name of CSV file for given alteration type
 * @param string alterationType - alterationType of these entries (therapeutic, biological, prognostic, diagnostic, unknown)
 * @param object log - /app/libs/logger instance
 *
 */
let parseAlterationsFile = (POG, alterationFile, alterationType, log) => {
  
  // Create promise
  let deferred = Q.defer();
  
  // Check that the provided alterationType is valid according to the schema
  if(db.models.alterations.rawAttributes.alterationType.values.indexOf(alterationType) === -1) deferred.reject('Invalid AlterationType. Given: ' + alterationType) && new Error('Invalid AlterationType. Given: ' + alterationType);
  
  // First parse in therapeutic
  let output = fs.createReadStream(baseDir + '/JReport_CSV_ODF/' + alterationFile, {'delimiter': ','});
  
  // Parse file!
  let parser = parse({delimiter: ',', columns: true},
    (err, result) => {
      
      // Was there a problem processing the file?
      if(err) {
        log('Unable to parse CSV file');
        console.log(err);
        deferred.reject({reason: 'parseCSVFail'});
      }
    
      // Remap results
      let entries = remapKeys(result, nconf.get('detailedGenomicAnalysis:alterations'));
      
      // Add new values for DB
      entries.forEach((v, k) => {
        // Map needed DB column values
        entries[k].pog_id = POG.id;
        entries[k].alterationType = alterationType;
        entries[k].newEntry = false;
      });
      
      // Log progress
      log('Parsed .csv for: ' + alterationType);
      
      // Resolve Promise
      deferred.resolve(entries);
    }
  );
  
  // Pipe file through parser
  output.pipe(parser);
  
  output.on('error', (err) => {
    log('Unable to find required CSV file');
    deferred.reject({reason: 'DGA-Alterations-sourceFileNotFound'});
  });
  
  return deferred.promise;
  
}

/* 
 * Alterations Loader
 * 
 * Load values for "Alterations with potential clinical relevance"
 * sources:
 *  - clin_rel_known_alt_detailed.csv   -Therapeutic
 *  - clin_rel_known_biol_detailed.csv  -Biological
 *  - clin_rel_known_diag_detailed.csv  -Diagnostic
 *  - clin_rel_known_prog_detailed.csv  -Prognostic
 *  - clin_rel_unknown_alt_detailed.csv -Unknown
 * 
 * Create DB entries for Alterations. Parse in CSV values, mutate, insert.
 * 
 * @param object POG - POG model object
 * @param object options - Currently no options defined on this import
 *
 */
module.exports = (POG, dir, logger) => {
  
  // Create promise
  let deferred = Q.defer();
  let alterations = [];
  baseDir = dir;

  // Setup Logger
  let log = logger.loader(POG.POGID, 'DGA.Variations');
  
  // Alterations to be processed
  let sources = [
    {file: 'clin_rel_known_alt_detailed.csv', type: 'therapeutic'},
    {file: 'clin_rel_known_biol_detailed.csv', type: 'biological'},
    {file: 'clin_rel_known_diag_detailed.csv', type: 'diagnostic'},
    {file: 'clin_rel_known_prog_detailed.csv', type: 'prognostic'},
    {file: 'clin_rel_unknown_alt_detailed.csv', type: 'unknown'}
  ];
  
  // Promises Array
  let promises = [];
  
  // Loop over sources and collect promises
  sources.forEach((input) => {
    promises.push(parseAlterationsFile(POG, input.file, input.type, log));
  });
  
  // Wait for all promises to be resolved
  Q.all(promises)
  .then((results) => {
    // Log progress
    log('Variations collected: ' + _.flattenDepth(results, 2).length);
    
    // Load into Database
    db.models.alterations.bulkCreate(_.flattenDepth(results, 2)).then(
      (result) => {
        
        // Successfull create into DB
        log('Database entries created.', logger.SUCCESS);
        
        // Done!
        deferred.resolve({alterations: true});
        
      },
      // Problem creating DB entries
      (err) => {
        console.log("SQL Error", err);
        log('Unable to create database entries.', logger.ERROR);
        new Error('Unable to create variations database entries.');
        deferred.reject('Unable to create variations database entries.');
      }
    );
    
  });
      
  return deferred.promise;
}
