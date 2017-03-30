"use strict";

// Dependencies
let db = require(process.cwd() + '/app/models'),
    fs = require('fs'),
    parse = require('csv-parse'),
    remapKeys = require(process.cwd() + '/app/libs/remapKeys'),
    _ = require('lodash'),
    Q = require('q'),
    pyconf = require('pyconf'),
    nconf = require('nconf').argv().env().file({file: process.cwd() + '/config/'+process.env.NODE_ENV+'.json'}),
    colMap = require('nconf').file({file: process.cwd() + '/config/columnMaps.json'});

/*
 * Parse Alterations File
 *
 * 
 * @param object POG - POG model object
 * @param string alterationFile - name of CSV file for given alteration type
 * @param object log - /app/libs/logger instance
 *
 */
let parseAlterationsFile = (POG, probeFile, probeDir, log) => {
  
  // Create promise
  let deferred = Q.defer();

  // First parse in therapeutic
  let output = fs.createReadStream(probeDir + '/JReport_CSV_ODF/' + probeFile, {'delimiter': ','});

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
      let entries = remapKeys(result, colMap.get('summary:probeTargets'));
      
      // Add new values for DB
      entries.forEach((v, k) => {
        // Map needed DB column values
        entries[k].pog_id = POG.id;
        entries[k].newEntry = false;
      });
      
      // Log progress
      log('Parsed '+probeFile+'.csv');
      
      // Resolve Promise
      deferred.resolve(entries);
    }
  );
  
  // Pipe file through parser
  output.pipe(parser);
  
  output.on('error', (err) => {
    log('Unable to find required CSV file');
    deferred.reject({reason: 'probeTarget - sourceFileNotFound'});
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
module.exports = (POG, basedir, logger) => {

  // Create promise
  let deferred = Q.defer();
  let alterations = [];

  // Setup Logger
  let log = logger.loader(POG.POGID, 'summary.ProbeTarget');

  // Read in config file.
  let config;
  let probeDir;
  pyconf.readFile(basedir + '/Report_tracking.cfg', (err, conf) => {
    // Set config
    config = conf;
    // Set probe directory from Python config
    probeDir = config.Probe_Report_Folder;

    // Alterations to be processed
    let sources = [
      {file: 'clin_rel_known_alt_detailed.csv'},
      {file: 'clin_rel_known_biol_detailed.csv'},
      {file: 'clin_rel_known_diag_detailed.csv'},
      {file: 'clin_rel_known_prog_detailed.csv'},
      {file: 'clin_rel_unknown_alt_detailed.csv'}
    ];

    // Check for sources first.

    // Promises Array
    let promises = [];

    // Loop over sources and collect promises
    sources.forEach((input) => {
      if(!fs.existsSync(probeDir + '/JReport_CSV_ODF/' + input.file)) {
        deferred.resolve({probeTarget: false});
        log('Unable to find probe report data. Missing input file(s): '+input.file, logger.WARNING);
        return;
      }
      promises.push(parseAlterationsFile(POG, input.file, probeDir, log));
    });

    if(promises.length == 0) {
      log('Probe Target Gene data not available.', logger.WARNING);
      return;
    }

    // Wait for all promises to be resolved
    Q.all(promises)
    .then((results) => {
      // Log progress
      log('Variations collected: ' + _.flattenDepth(results, 2).length);

      let entries = [];

      // Process Results
      results = _.flattenDepth(results, 2);
      results.forEach((val) => {

        // Look for an entry
        if(!_.find(entries, (e) => {

            if(e.gene === val.gene && e.variant === val.variant && e.sample === val.sample) return true;
            return false;

          })) {
          entries.push({gene: val.gene, variant: val.variant, sample: val.sample, pog_id: POG.id});
        }

      });

      db.models.probeTarget.bulkCreate(entries).then(
        (result) => {

          // Successfull create into DB
          log('Database entries created.', logger.SUCCESS);

          // Done!
          deferred.resolve({probeTarget: true});

        },
        // Problem creating DB entries
        (err) => {
          log('Unable to create database entries.', logger.ERROR);
          new Error('Unable to create probe target database entries.');
          deferred.reject('Unable to create probe target database entries.');
        }
      );

    },
    (error) => {
      log('Unable to create probe report data.', logger.WARNING);
      deferred.resolve({probeTarget: false});
    }

    );

  });
  return deferred.promise;
}
