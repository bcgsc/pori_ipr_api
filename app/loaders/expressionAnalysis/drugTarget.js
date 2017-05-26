"use strict";

// Dependencies
let db = require(process.cwd() + '/app/models'),
  fs = require('fs'),
  parse = require('csv-parse'),
  remapKeys = require(process.cwd() + '/app/libs/remapKeys'),
  _ = require('lodash'),
  Q = require('q'),
  p2s = require(process.cwd() + '/app/libs/pyToSql'),
  nconf = require('nconf').argv().env().file({file: process.cwd() + '/config/columnMaps.json'});

/**
 * Parse Expression Drug Target Analysis File
 *
 *
 * @param {object} report - POG Report model object
 * @param {string} dir - Base directory for loading sources
 * @param {object} logger - Logging object reference
 *
 */
module.exports = (report, dir, logger) => {

  // Create promise
  let deferred = Q.defer();

  // Setup Logger
  let log = logger.loader(report.ident, 'Exp.DrugTarget');

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
        deferred.reject({loader: 'drugTarget', message: 'Unable to parse the CSV: ' + dir + '/JReport_CSV_ODF/therapeutic_targets.csv', result: false});
      }

      // Create Entries Array
      let entries = remapKeys(result, nconf.get('expressionAnalysis:drugTarget'));

      // Loop over returned rows, append row with POGid
      _.forEach(entries, (v, k) => {
        entries[k].pog_id = report.pog_id;
        entries[k].pog_report_id = report.id;
        entries[k] = p2s(v, ['kIQR', 'kIQRNormal', 'copy']);
      });

      // Add to Database
      db.models.drugTarget.bulkCreate(entries).then(
        (result) => {
          log('Finished Expression Drug Target Analysis.', logger.SUCCESS);

          // Resolve Promise
          deferred.resolve({module: 'drugTarget', result: true, data: result});
        },
        (err) => {
          console.log('SQL ERROR', err);
          log('Failed to load Expression Drug Target Analysis.', logger.ERROR);
          deferred.reject({loader: 'drugTarget', message: 'Unable to create database entries.', result: false});
        }
      );
    }
  );

  // Pipe file through parser
  output.pipe(parser);

  output.on('error', (err) => {
    log('Unable to find required CSV file');
    deferred.reject({loader: 'drugTarget', message: 'Unable to find the CSV: ' + dir + '/JReport_CSV_ODF/therapeutic_targets.csv', result: false});
  });

  return deferred.promise;

}
