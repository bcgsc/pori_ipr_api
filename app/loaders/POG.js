"use strict";

// Dependencies
let db = require(process.cwd() + '/app/models'),
  fs = require('fs'),
  parse = require('csv-parse'),
  remapKeys = require(process.cwd() + '/app/libs/remapKeys'),
  _ = require('lodash'),
  Q = require('q'),
  glob = require('glob'),
  nconf = require('nconf').argv().env().file({file: process.cwd() + '/config/config.json'});

/*
 * Parse Patient Information File
 *
 *
 * @param object POG - POG model object
 *
 */
module.exports = (POG, dir, logger) => {

  // Create promise
  let deferred = Q.defer();

  // Setup Logger
  let log = logger.loader(POG.POGID, 'POG.SampleInfo');

  let pogInfo = {};

  // Wait for promises
  Q.all([
    getInfo(dir, 'sample_info.csv', log),
    getInfo(dir, 'qc_summary.csv', log)
  ]).then(
    (results) => {
      // Finished reading files
      log('Finished reading Sample, QC & Config File', logger.SUCCESS);

      // Pull and process results
      pogInfo.sampleInfo = results[0];
      pogInfo.seqQC = results[1];

      glob(dir + '/Report_tracking.c*', (err, files) => {

        // Did we find it?
        if(err || files.length == 0) {
          log('Unable to find report config file.', logger.ERROR);
          deferred.reject('Unable to find report config file');
          throw new Error('Unable to find report config file');
        }

        fs.readFile(files[0], {encoding: 'utf8'}, (err, data) => {

          if(err) {
            console.log(err);
            log('Failed to read config file', log.ERROR);
            deferred.reject('Unable to read config file');
          }

          // Read config file
          log('Read in config file', log.SUCCESS);
          pogInfo.config = data;

          // Add to Database
          db.models.POG.update(pogInfo, {where: { id: POG.id }, limit: 1})
            .then(
              (result) => {
                log('POG Sample & QC information loaded.', logger.SUCCESS);
                deferred.resolve({pogSampleQC: true});
              },
              (err) => {
                console.log('SQL Error', err);
                log('Failed to load patient history.',logger.ERROR)
                deferred.reject('Unable to load POG sample & QC info');
              }
            );
        }); // End Read File

      }); // end Glob
    },
    (error) => {
      deferred.reject('Unable to load POG QC and sample info');
    }
  );

  return deferred.promise;

};

// Get Sample Info
let getInfo = (dir, file, log) => {

  // Create promise
  let deferred = Q.defer();

  // Read in file
  let output = fs.createReadStream(dir + '/JReport_CSV_ODF/' + file);

  log('Found and read '+file+' file.');

  // Parse file!
  let parser = parse({delimiter: ',', columns: true},
    (err, result) => {

      // Was there a problem processing the file?
      if(err) {
        log('Unable to parse CSV file');
        console.log(err);
        deferred.reject({reason: 'parseCSVFail'});
      }

      log('Parsed and read ' + file+ '.');
      deferred.resolve(result);
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