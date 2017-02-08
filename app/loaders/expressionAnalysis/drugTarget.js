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
 * Parse Expression Drug Target Analysis File
 *
 *
 * @param object POG - POG model object
 * @param string dir - Base directory for loading sources
 * @param object logger - Logging object reference
 *
 */
module.exports = (POG, dir, logger) => {

  // Create promise
  let deferred = Q.defer();

  // Setup Logger
  let log = logger.loader(POG.POGID, 'Exp.DrugTarget');

  // First parse in therapeutic
  let output = fs.createReadStream(dir + '/JReport_CSV_ODF/therapeutic_targets.csv');

  log('Found and read therapeutic_targets.csv file.');

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
      let entries = remapKeys(result, nconf.get('columnMapping:expressionAnalysis:drugTarget'));

      // Loop over returned rows, and read in each column value
      _.forEach(result, (v, k) => {
        entries[k].pog_id = POG.id
      });

      // Add to Database
      db.models.drugTarget.bulkCreate(entries).then(
        (result) => {
          log('Finished Expression Drug Target Analysis.', logger.SUCCESS)

          // Resolve Promise
          deferred.resolve(result);
        },
        (err) => {
          log('Failed to load Expression Drug Target Analysis.', logger.ERROR)
          deferred.reject('Failed to load Expression Drug Target Analysis.');
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
