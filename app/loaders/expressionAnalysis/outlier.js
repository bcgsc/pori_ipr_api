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

/**
 * Parse Expression Outliers File
 *
 *
 * @param {object} report - POG report model object
 * @param {string} expressionOutlierFile - name of CSV file for given small mutation type
 * @param {string} outlierType - outlierType of these entries (clinical, nostic, biological)
 * @param {object} log - /app/libs/logger instance
 *
 */
let parseExpressionOutlierFile = (report, expressionOutlierFile, outlierType, log) => {

  // Create promise
  let deferred = Q.defer();

  // Check that the provided alterationType is valid according to the schema
  if(db.models.outlier.rawAttributes.outlierType.values.indexOf(outlierType) === -1) deferred.reject('Invalid outlierType. Given: ' + outlierType) && new Error('Invalid outlierType. Given: ' + outlierType);

  // First parse in therapeutic
  let output = fs.createReadStream(baseDir + '/JReport_CSV_ODF/' + expressionOutlierFile, {'delimiter': ','});

  // Parse file!
  let parser = parse({delimiter: ',', columns: true},
    (err, result) => {

      // Was there a problem processing the file?
      if(err) {
        log('Unable to parse Expression Outlier CSV file');
        console.log(err);
        deferred.reject({loader: 'expressionOutlier', message: 'Unable to parse the CSV: ' + baseDir + '/JReport_CSV_ODF/' + expressionOutlierFile, result: false});
      }

      // Remap results
      let entries = remapKeys(result, nconf.get('expressionAnalysis:outlier'));

      // Add new values for DB
      entries.forEach((v, k) => {
        // Map needed DB column values
        entries[k].pog_id = report.pog_id;
        entries[k].pog_report_id = report.id;
        entries[k].outlierType = outlierType;
      });

      // Log progress
      log('Parsed .csv for: ' + outlierType);

      // Resolve Promise
      deferred.resolve(entries);
    }
  );

  // Pipe file through parser
  output.pipe(parser);

  output.on('error', (err) => {
    log('Unable to find required CSV file: ' + expressionOutlierFile);
    deferred.reject({loader: 'expressionOutlier', message: 'Unable to find the CSV: ' + baseDir + '/JReport_CSV_ODF/' + expressionOutlierFile, result: false});
  });

  return deferred.promise;

};

/**
 * Expression - Outliers Loader
 *
 * Load values for "Expression Analysis"
 * sources:
 *  - exp_biol.csv   -Biological
 *  - exp_pot_clin_rel.csv  -Clinical
 *  - exp_prog_diag.csv  -Nostic
 *
 * Create DB entries for Expression Outliers. Parse in CSV values, mutate, insert.
 *
 * @param {object} report - POG report model object
 * @param {string} dir - Base directory to load from
 * @param {object} logger - Logging utility
 *
 */
module.exports = (report, dir, logger) => {

  baseDir = dir;

  // Create promise
  let deferred = Q.defer();

  // Setup Logger
  let log = logger.loader(report.ident, 'Exp.Outlier');

  // Small Mutations to be processed
  let sources = [
    {file: 'exp_biol.csv', type: 'biological'},
    {file: 'exp_pot_clin_rel.csv', type: 'clinical'},
    {file: 'exp_prog_diag.csv', type: 'nostic'},
  ];

  // Promises Array
  let promises = [];

  // Loop over sources and collect promises
  sources.forEach((input) => {
    promises.push(parseExpressionOutlierFile(report, input.file, input.type, log));
  });

  // Wait for all promises to be resolved
  Q.all(promises)
    .then((results) => {
      // Log progress
      log('Expression Outliers collected: ' + _.flattenDepth(results, 2).length);

      // Load into Database
      db.models.outlier.bulkCreate(_.flattenDepth(results, 2)).then(
        (result) => {

          // Successful create into DB
          log('Database entries created.', logger.SUCCESS);

          // Done!
          deferred.resolve({loader: 'expressionOutliers', result: true, data: result});
        },
        // Problem creating DB entries
        (err) => {
          console.log(err);
          log('Unable to create database entries.', logger.ERROR);
          deferred.reject({loader: 'expressionOutlier', message: 'Unable to create the database entries.', result: false});
          new Error('Unable to create expression outliers database entries.');
        }
      );

    },
    (err) => {
      console.log(err);
      log('Unable to load a CSV file', logger.ERROR);
      deferred.reject({loader: 'expressionOutlier', message: 'Unable to load a CSV file: ' + err.message, result: false});
    });

  return deferred.promise;
};
