"use strict";

// Dependencies
let db = require(process.cwd() + '/app/models'),
  fs = require('fs'),
  parse = require('csv-parse'),
  remapKeys = require(process.cwd() + '/app/libs/remapKeys'),
  _ = require('lodash'),
  nconf = require('nconf').argv().env().file({file: process.cwd() + '/config/columnMaps.json'});

/**
 * Microbial Data Loader
 *
 */
class microbialLoader {

  constructor(report, dir, logger) {

    this.report = report;
    this.baseDir = dir;
    this.logger = logger;
    this.logging = logger.loader(this.report.ident, 'Summary.Microbial');

    this.logging('Starting microbial loader');

  }

  /**
   * Execute Loader
   *
   * @returns {Promise|object} - Returns object with loader completion status
   */
  load() {
    return new Promise((resolve,reject) => {

      this.retrieveFileEntry()
        .then(this.insertEntries.bind(this))
        .then(
        (result) => {
          this.logging('Microbial Data completed.', this.logger.SUCCESS);
          resolve({name: 'microbial', result: true});
        },
        (err) => {
          console.log(err);
          this.logging('Microbial Data was not able to complete.', this.logger.ERROR);
          resolve({loader: 'microbial', message: 'Unable to load microbial data: ' + err.message, result: false});
        }
      )

    });
  }

  /**
   * Load microbial data CSV file and parse
   *
   * @returns {Promise}
   */
  retrieveFileEntry() {
    return new Promise((resolve, reject) => {

      // Read in file
      let output = fs.createReadStream(this.baseDir + '/JReport_CSV_ODF/microbial_detection.csv');

      // Parse file!
      let parser = parse({delimiter: ',', columns: true},
        (err, result) => {

          // Was there a problem processing the file?
          if(err) {
            this.logging('Unable to parse CSV file');
            console.log(err);
            reject({loader: 'microbial', message: 'Unable to parse the microbial file: ' + this.baseDir + '/JReport_CSV_ODF/microbial_detection.csv', result: false});
          }

          if(result.length > 1) return new Error('['+this.report.ident+'][Loader][Summary.PatientInformation] More than one microbial data entry found.');

          // Resolve With the data entries
          resolve(result);
        }
      );

      // Pipe file through parser
      output.pipe(parser);

      output.on('error', (err) => {
        log('Unable to find required CSV file');
        reject({loader: 'microbial', message: 'Unable to find the microbial file: ' + this.baseDir + '/JReport_CSV_ODF/microbial_detection.csv', result: false});
      });

    });
  }


  /**
   * Create new Microbial Data entry
   *
   * @param {array} entries - A collection of patient information details (only 1 row expected)
   * @returns {Promise}
   */
  insertEntries(entries) {
    return new Promise((resolve, reject) => {

      // Remap results
      let entry = _.head(remapKeys(entries, nconf.get('summary:microbial')));

      // Map needed DB column values
      entry.pog_report_id = this.report.id;

      // Add to Database
      db.models.summary_microbial.create(entry).then(
        (result) => {

          this.logging('Microbial data loaded.', this.logger.SUCCESS);
          resolve(result);

        },
        (err) => {
          this.logging('Failed to load microbial data.', this.logger.ERROR);
          reject({loader: 'microbial', message: 'Unable to create database entries', result: false});
        }
      );

    });
  }

}

module.exports = microbialLoader;
