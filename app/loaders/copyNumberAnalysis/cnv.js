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
 * Parse Copy Number Analysis CNV File
 *
 *
 * @param object POG - POG model object
 * @param string cnvFile - name of CSV file for given small mutation type
 * @param string cnvVariant - cnvVariant of these entries (clinical, nostic, biological, unknown)
 * @param object log - /app/libs/logger instance
 *
 */
let parseCnvFile = (report, cnvFile, cnvVariant, log) => {

  // Create promise
  let deferred = Q.defer();

  // Check that the provided alterationType is valid according to the schema
  if(db.models.cnv.rawAttributes.cnvVariant.values.indexOf(cnvVariant) === -1) deferred.reject('Invalid MutationType. Given: ' + cnvVariant) && new Error('Invalid MutationType. Given: ' + cnvVariant);

  // First parse in therapeutic
  let output = fs.createReadStream(baseDir + '/JReport_CSV_ODF/' + cnvFile, {'delimiter': ','});

  // Parse file!
  let parser = parse({delimiter: ',', columns: true},
    (err, result) => {

      // Was there a problem processing the file?
      if(err) {
        log('Unable to parse CSV file');
        console.log(err);
        deferred.reject({loader: 'cnv', message: 'Unable to parse the CSV file: ' + baseDir + '/JReport_CSV_ODF/' + cnvFile});
      }

      // Remap results
      let entries = remapKeys(result, nconf.get('copyNumberAnalysis:cnv'));

      // Add new values for DB
      entries.forEach((v, k) => {
        // Map needed DB column values
        entries[k].pog_id = report.pog_id;
        entries[k].pog_report_id = report.id;
        entries[k].cnvVariant = cnvVariant;
      });

      // Log progress
      log('Parsed .csv for: ' + cnvVariant);

      // Resolve Promise
      deferred.resolve(entries);
    }
  );

  // Pipe file through parser
  output.pipe(parser);

  output.on('error', (err) => {
    log('Unable to find required CSV file: ' + cnvFile);
    deferred.reject({loader: 'cnv', message: 'Unable to find the CSV file: ' + baseDir + '/JReport_CSV_ODF/' + cnvFile});
  });

  return deferred.promise;

};

/**
 * Copy Number Analysis - CNV Loader
 *
 * Load values for "Copy Number Analysis"
 * sources:
 *  - cnv_amplified_oncogenes.csv   -Commonly Amplified Oncogenes with Copy Gains
 *  - cnv_biol.csv  -Biological
 *  - cnv_high_exp_oncogenes_copy_gains.csv  -Highly Expressed Oncgogenes with Copy Gains
 *  - cnv_homozygous_del_tsg.csv  -Homozygously Deleted Tumour Suppressors
 *  - cnv_low_exp_tsg_copy_losses.csv  -Lowly expressed Tumour Suppressor Genes with Copy Losses
 *  - cnv_pot_clin_rel.csv  -CNVs of potential clinical relevance
 *  - cnv_prog_diag.csv  -Prognostic or Diagnostic
 *
 * Create DB entries for Small Mutations. Parse in CSV values, mutate, insert.
 *
 * @param {object} report - POG report model object
 * @param {string} dir - base directory
 * @param {object} logger - Logging interface
 *
 */
module.exports = (report, dir, logger) => {

  // Create promise
  let deferred = Q.defer();

  baseDir = dir;

  // Setup Logger
  let log = logger.loader(report.ident, 'CopyNumberAnalysis.CNV');

  // Small Mutations to be processed
  let sources = [
    {file: 'cnv_amplified_oncogenes.csv', type: 'commonAmplified'},
    {file: 'cnv_biol.csv', type: 'biological'},
    {file: 'cnv_high_exp_oncogenes_copy_gains.csv', type: 'highlyExpOncoGain'},
    {file: 'cnv_homozygous_del_tsg.csv', type: 'homodTumourSupress'},
    {file: 'cnv_low_exp_tsg_copy_losses.csv', type: 'lowlyExpTSloss'},
    {file: 'cnv_pot_clin_rel.csv', type: 'clinical'},
    {file: 'cnv_prog_diag.csv', type: 'nostic'}
  ];

  // Promises Array
  let promises = [];

  // Loop over sources and collect promises
  sources.forEach((input) => {
    promises.push(parseCnvFile(report, input.file, input.type, log));
  });

  // Wait for all promises to be resolved
  Q.all(promises)
    .then((results) => {
      // Log progress
      log('CNVs collected: ' + _.flattenDepth(results, 2).length);

      // Load into Database
      db.models.cnv.bulkCreate(_.flattenDepth(results, 2)).then(
        (result) => {

          // Successful create into DB
          log('Database entries created.', logger.SUCCESS);

          // Done!
          deferred.resolve({cnv: true});

        },
        // Problem creating DB entries
        (err) => {
          console.log(err);
          log('Unable to create database entries.', logger.ERROR);
          new Error('Unable to create cnv database entries.');
          deferred.reject({loader: 'cnv', message: 'Unable to create cnv database entries.'});
        }
      );

    },
    (err) => {
      deferred.reject({loader: 'cnv', message: 'Unable to load all CSVs: ' + err.message});
    });

  return deferred.promise;
};
