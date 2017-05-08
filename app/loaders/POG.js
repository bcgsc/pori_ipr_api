"use strict";

// Dependencies
let db = require(process.cwd() + '/app/models'),
  fs = require('fs'),
  parse = require('csv-parse'),
  remapKeys = require(process.cwd() + '/app/libs/remapKeys'),
  _ = require('lodash'),
  Q = require('q'),
  glob = require('glob'),
  pyconf = require('pyconf'),
  nconf = require('nconf').argv().env().file({file: process.cwd() + '/config/columnMaps.json'});

/**
 * Parse Patient Information File
 *
 *
 * @param {object} report - POG report model object
 * @param {string} dir - base directory
 * @param {object} logger - logging interface
 * @param {object} options
 *
 * @returns {promise|object} - Resolves with boolean
 *
 */
module.exports = (report, dir, logger, options={}) => {

  // Create promise
  let deferred = Q.defer();

  // Setup Logger
  let log = logger.loader(report.ident, 'POG.SampleInfo');

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
        if(err || files.length === 0) {
          log('Unable to find report config file.', logger.ERROR);
          deferred.reject('Unable to find report config file');
          throw new Error('Unable to find report config file');
        }

        pyconf.readFile(files[0], (err, conf) => {

          if(err) {
            console.log(err);
            log('Failed to read config file', log.ERROR);
            deferred.reject('Unable to read config file');
          }

          // Read config file
          log('Read in config file', log.SUCCESS);
          pogInfo.config = _.join(conf.__lines, "\r\n");


          // Get Version Numbers
          pogInfo.kbVersion = conf.KnowledgebaseModuleVersion;
          pogInfo.reportVersion = conf.programVersion;

          // Add to Database
          db.models.analysis_report.update(pogInfo, {where: {id: report.id}, limit: 1})
            .then(
              (result) => {
                log('POG Sample & QC information loaded.', logger.SUCCESS);
                deferred.resolve({pogSampleQC: true});
              },
              (err) => {
                console.log('SQL Error', err);
                log('Failed to load patient history.', logger.ERROR)
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