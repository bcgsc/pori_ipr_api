"use strict";

// Dependencies
let db = require(process.cwd() + '/app/models'),
    fs = require('fs'),
    parse = require('csv-parse'),
    remapKeys = require(process.cwd() + '/app/libs/remapKeys'),
    _ = require('lodash'),
    Q = require('q'),
    GenomicLoader = require('../index'),
    nconf = require('nconf').argv().env().file({file: process.cwd() + '/config/columnMaps.json'});


/*
 * Parse Patient Information File
 *
 * 
 * @param object POG - POG model object
 *
 */
/*
module.exports = (report, dir, logger) => {

  // Create promise
  let deferred = Q.defer();
  
  // Read in file
  let output = fs.createReadStream(dir + '/JReport_CSV_ODF/patient_info.csv');

  // Setup Logger
  let log = logger.loader(report.ident, 'Summary.PatientInformation');
  
  log('Found and read patient_info.csv file.');

  
  // Parse file!
  let parser = parse({delimiter: ',', columns: true},
    (err, result) => {
      
      // Was there a problem processing the file?
      if(err) {
        log('Unable to parse CSV file');
        console.log(err);
        deferred.reject({reason: 'parseCSVFail'});
      }
      
      if(result.length > 1) return new Error('['+report.ident+'][Loader][Summary.PatientInformation] More than one patient history entry found.');
    
      // Remap results
      let entry = _.head(remapKeys(result, nconf.get('summary:patientInformation')));
      
      // Map needed DB column values
      entry.pog_id = report.pog_id;
      entry.pog_report_id = report.id;

      // Add to Database
      db.models.patientInformation.create(entry).then(
        (result) => {

          log('Patient information loaded.', logger.SUCCESS);
          
          // Call Subloader
          require('./sampleSummary.js')(report, dir, logger).then(
            (success) => {
              // Resolve Promise
              deferred.resolve(entry);
            },
            (err) => {
              deferred.reject({reason: 'sampleSummaryFailed'});
            }
          );
          
        },
        (err) => {
          log('Failed to load patient history.',logger.ERROR)
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
*/
/**
 * Patient Loader extends Genomic Loader
 *
 * Extends Genomic Loader
 *
 */
class patientLoader {

  constructor(report, dir, logger) {

    this.report = report;
    this.baseDir = dir;
    this.logger = logger;
    this.logging = logger.loader(this.report.ident, 'Summary.PatientInformation');

    this.logging('Starting patient information logger');

  }

  /**
   * Execute Loader
   *
   * @returns {Promise|object} - Returns object with loader completion status
   */
  load() {
    return new Promise((resolve,reject) => {

      // Check if the patient Information exists yet
      this.checkPatientInformationExists().then(
        (exists) => {

          // Don't need to create entry
          if(exists) {
            this.logging('Patient Information already loaded.', this.logger.SUCCESS);
            resolve({name: 'patientInformation', result: null});
          }

          // Need to create entry
          if(!exists) {
            this.retrieveFileEntry()
              .then(this.insertEntries.bind(this))
              .then(this.runSampleSummary.bind(this)).then(
              (result) => {
                this.logging('Patient Information completed.', this.logger.SUCCESS);
                resolve({name: 'patientInformation', result: true});
              },
              (err) => {
                console.log(err);
                this.logging('Patient Information was not able to complete.', this.logger.ERROR);
                resolve({name: 'patientInformation', result: false});
              }
            )
          }

        },
        (err) => {
          resolve({name: 'patientInformation', result: false});
        }
      );

    });
  }

  /**
   * Check is a patient information entry exists yet
   *
   * @returns {Promise|boolean}
   */
  checkPatientInformationExists() {
    return new Promise((resolve,reject) => {
      db.models.patientInformation.findOne({where: {pog_id: this.report.pog_id}}).then(
        (entry) => {
          if(entry !== null) resolve(true);
          if(entry === null) resolve(false);
        },
        (err) => {
          reject(err);
        }
      )
    });
  }


  retrieveFileEntry() {
    return new Promise((resolve, reject) => {

      // Read in file
      let output = fs.createReadStream(this.baseDir + '/JReport_CSV_ODF/patient_info.csv');

      // Parse file!
      let parser = parse({delimiter: ',', columns: true},
        (err, result) => {

          // Was there a problem processing the file?
          if(err) {
            this.logging('Unable to parse CSV file');
            console.log(err);
            reject({reason: 'parseCSVFail'});
          }

          if(result.length > 1) return new Error('['+this.report.ident+'][Loader][Summary.PatientInformation] More than one patient history entry found.');

          // Resolve With the data entries
          resolve(result);
        }
      );

      // Pipe file through parser
      output.pipe(parser);

      output.on('error', (err) => {
        log('Unable to find required CSV file');
        reject({reason: 'sourceFileNotFound'});
      });

    });
  }


  /**
   * Create new Patient Information entries
   *
   * @param {array} entries - A collection of patient information details (only 1 row expected)
   * @returns {Promise}
   */
  insertEntries(entries) {
    return new Promise((resolve,reject) => {

      // Remap results
      let entry = _.head(remapKeys(entries, nconf.get('summary:patientInformation')));

      // Map needed DB column values
      entry.pog_id = this.report.pog_id;
      entry.pog_report_id = this.report.id;

      // Add to Database
      db.models.patientInformation.create(entry).then(
        (result) => {

          this.logging('Patient information loaded.', this.logger.SUCCESS);
          resolve(result);

        },
        (err) => {
          this.logging('Failed to load patient history.', this.logger.ERROR)
        }
      );

    });
  }

  /**
   * Run Sample Summary loader
   *
   * @returns {Promise}
   */
  runSampleSummary() {
    return new Promise((resolve,reject) => {

      // Call Subloader
      require('./sampleSummary.js')(this.report, this.baseDir, this.logger).then(
        (success) => {
          // Resolve Promise
          resolve(success);
        },
        (err) => {
          reject({reason: 'sampleSummaryFailed'});
        }
      );

    });
  }

}

module.exports = patientLoader;
