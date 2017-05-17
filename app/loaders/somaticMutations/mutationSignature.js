"use strict";

// Dependencies
let db = require(process.cwd() + '/app/models'),
  fs = require('fs'),
  glob = require('glob'),
  parse = require('csv-parse'),
  remapKeys = require(process.cwd() + '/app/libs/remapKeys'),
  _ = require('lodash'),
  Q = require('q'),
  nconf = require('nconf').argv().env().file({file: process.cwd() + '/config/columnMaps.json'});

/**
 * Load Mutation Signature file and parse into database
 *
 * @param {object} report
 * @param {string} dir
 * @param {object} logger
 * @param {object} options
 * @returns {*|promise}
 */
module.exports = (report, dir, logger, options={}) => {

  // Create promise
  let deferred = Q.defer();

  // Setup Logger
  let log = logger.loader(report.ident, 'SomaticMutations.MutationSignature');

  let project = options.project || 'pog';

  // Find File
  glob('/projects/tumour_char/'+project+'/somatic/signature/' + report.pog.POGID + '/'+options.library+'/v*/*_msig_combined.txt', (err, files) => {

    if(err || files.length === 0) {
      log('Unable to find Mutation Signature source file', logger.ERROR);
      console.log('Mutation Signature Error', err);
      console.log('Attempted to load', '/projects/tumour_char/'+project+'/somatic/signature/' + report.pog.POGID + '/'+options.library+'/v*/*_msig_combined.txt');
      throw new Error('Unable to find Mutation Signature source file')
    }

    // Get File
    let output = fs.createReadStream(files[0]);

    log('Found and read sample_summary.csv file.');

    // Parse file!
    let parser = parse({delimiter: '	', columns: true},
      (err, result) => {

        // Was there a problem processing the file?
        if(err) {
          log('Unable to parse CSV file');
          console.log(err);
          deferred.reject({reason: 'parseCSVFail', message: 'Unable to find CSV file for Mutation Signature'});
        }

        let entries = remapKeys(result, nconf.get('somaticMutations:mutationSignature'));

        // Loop over entries
        _.forEach(entries, (v, k) => {
          entries[k].pog_id = report.pog_id;
          entries[k].pog_report_id = report.id;
          entries[k].signature = v.signature.match(/[0-9]{1,2}/g)[0];
        });

        // Add to Database
        db.models.mutationSignature.bulkCreate(entries).then(
          (result) => {
            log('Mutation Signatures successfully created.', logger.SUCCESS);

            // Resolve Promise
            deferred.resolve({status: true, db: result, data: entries, message: 'Successfully loaded mutation signatures', loader: 'SomaticMutations.MutationSignature'});
          },
          (err) => {
            console.log(err);
            log('Mutation Signatures failed to insert.',logger.ERROR);
            deferred.reject({status: false, error: err, message: 'Failed to load Mutation Signatures', loader: 'SomaticMutations.MutationSignature'});
          }
        );
      }
    );

    // Pipe file through parser
    output.pipe(parser);

    output.on('error', (err) => {
      log('Unable to find required CSV file', logger.ERROR);
      console.log(err);
      deferred.reject({status: false, error: err, message: 'Source txt file not found', loader: 'SomaticMutations.MutationSignature'});
    });

  });

  return deferred.promise;

};