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
 * Load Probe test information
 *
 *
 * @param {object} report - POG report model object
 * @param {string} dir - CSV Base directory
 * @param {object} logger - Logging interface
 *
 */
module.exports = (report, dir, logger) => {

  // Create promise
  let deferred = Q.defer();

  // Parsse input file
  let output = fs.createReadStream(dir + '/JReport_CSV_ODF/probe_test_info.csv');

  // Setup Logger
  let log = logger.loader(report.ident, 'ProbeTestInformation');

  log('Found and read probe_test_info.csv file.');

  // Parse file!
  let parser = parse({delimiter: ',', columns: true},
    (err, result) => {

      // Was there a problem processing the file?
      if(err) {
        log('Unable to parse CSV file');
        console.log(err);
        deferred.reject({reason: 'parseCSVFail'});
      }

      if(result.length > 1) return new Error('['+report.ident+'][Loader][ProbeTestInformation] More than one probe test information entry found.');

      // Remap results
      let entry = _.head(result);

      // Map needed DB column values
      entry.pog_id = report.pog_id;
      entry.pog_report_id = report.id;

      // Add to Database
      db.models.probe_test_information.create(entry).then(
        (result) => {
          // Done
          log('Probe test information loaded.', logger.SUCCESS);

          // Resolve Promise
          deferred.resolve(entry);
        },
        (err) => {
          console.log(err);
          log('Failed to create Probe test information entry.', logger.ERROR);
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

};
