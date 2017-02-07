"use strict";

// Dependencies
let db = require(process.cwd() + '/app/models'),
  fs = require('fs'),
  parse = require('csv-parse'),
  remapKeys = require(process.cwd() + '/app/libs/remapKeys'),
  _ = require('lodash'),
  Q = require('q'),
  nconf = require('nconf').argv().env().file({file: process.cwd() + '/config/config.json'});

let baseDir;

/*
 * Parse Small Mutations File
 *
 *
 * @param object POG - POG model object
 * @param string smallMutationFile - name of CSV file for given small mutation type
 * @param string mutationType - mutationType of these entries (clinical, nostic, biological, unknown)
 * @param object log - /app/libs/logger instance
 *
 */
let parseSmallMutationFile = (POG, smallMutationFile, mutationType, log) => {

  // Create promise
  let deferred = Q.defer();

  // Check that the provided alterationType is valid according to the schema
  if(db.models.smallMutations.rawAttributes.mutationType.values.indexOf(mutationType) === -1) deferred.reject('Invalid MutationType. Given: ' + mutationType) && new Error('Invalid MutationType. Given: ' + mutationType);

  // First parse in therapeutic
  let output = fs.createReadStream(baseDir + '/JReport_CSV_ODF/' + smallMutationFile, {'delimiter': ','});

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
      let entries = remapKeys(result, nconf.get('columnMapping:somaticMutations:smallMutations'));

      // Add new values for DB
      entries.forEach((v, k) => {
        // Map needed DB column values
        entries[k].pog_id = POG.id;
        entries[k].mutationType = mutationType;
      });

      // Log progress
      log('Parsed .csv for: ' + mutationType);

      // Resolve Promise
      deferred.resolve(entries);
    }
  );

  // Pipe file through parser
  output.pipe(parser);

  output.on('error', (err) => {
    log('Unable to find required CSV file: ' + smallMutationFile);
    deferred.reject({reason: 'sourceFileNotFound'});
  });

  return deferred.promise;

};

/*
 * Somatic Mutations - Small Mutations Loader
 *
 * Load values for "Small Mutations: Genomic Details"
 * sources:
 *  - sm_biol.csv   -Biological
 *  - sm_known_clin_rel.csv  -Clinical
 *  - sm_prog_diag.csv  -Nostic
 *  - sm_unknown.csv  -Unknown
 *
 * Create DB entries for Small Mutations. Parse in CSV values, mutate, insert.
 *
 * @param object POG - POG model object
 * @param object options - Currently no options defined on this import
 *
 */
module.exports = (POG, dir, logger) => {

  baseDir = dir;

  // Create promise
  let deferred = Q.defer();

  // Setup Logger
  let log = logger.loader(POG.POGID, 'SM.SmallMutations');

  // Small Mutations to be processed
  let sources = [
    {file: 'sm_biol.csv', type: 'biological'},
    {file: 'sm_known_clin_rel.csv', type: 'clinical'},
    {file: 'sm_prog_diag.csv', type: 'nostic'},
    {file: 'sm_uncertain.csv', type: 'unknown'}
  ];

  // Promises Array
  let promises = [];

  // Loop over sources and collect promises
  sources.forEach((input) => {
    promises.push(parseSmallMutationFile(POG, input.file, input.type, log));
  });

  // Wait for all promises to be resolved
  Q.all(promises)
    .then((results) => {
      // Log progress
      log('Small Mutations collected: ' + _.flattenDepth(results, 2).length);

      // Load into Database
      db.models.smallMutations.bulkCreate(_.flattenDepth(results, 2)).then(
        (result) => {

          // Successful create into DB
          log('Database entries created.', logger.SUCCESS);

          // Done!
          deferred.resolve({smallMutations: true});

        },
        // Problem creating DB entries
        (err) => {
          log('Unable to create database entries.', logger.ERROR);
          new Error('Unable to create small mutations database entries.');
          deferred.reject('Unable to create small mutations database entries.');
        }
      );

    });

  return deferred.promise;
};
