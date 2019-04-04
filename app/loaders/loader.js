"use strict";

const moment = require('moment');
const fs = require('fs');
const Parse = require('csv-parse');
const _ = require('lodash');

/**
 * Loader Class Wrapper
 *
 * Provides common functions for loaders to extend
 *
 */
class Loader {

  constructor(directory_base, directory_csv, directory_image, pog, report, options={}) {
    this.log = [];
    this.directory = {base: directory_base, csv: directory_csv, image: directory_image};
    this.name = ['loader'];
    this.report = report;
    this.pog = pog;
    this.options = options;
  }

  /**
   * Add to the log namespace
   *
   * @param {array|string} name - An array or string of name to add to log namespace
   */
  addToLogNamespace(name) {
    if(typeof name === 'string') name = [name];
    this.name = this.name.concat(name);
  }

  /**
   * Add message to loader log
   *
   * @param {string} message - The message to add to the log
   * @param {string} status - The status of the message
   */
  log(message, status) {

    // Insert entry to log
    let entry = "";

    entry += '[' + moment().format() + ']';
    entry += '[' + _.join(this.name, '][') + ']';
    entry += message;

    this.log.push(entry);
  }

  /**
   * Read and retrieve a file
   *
   * Checks for the existence of a file and returns the data
   *
   * @param {array} file - Read in a file and return the data
   *
   * @returns {Promise|array} - Resolves with the content of the file
   */
  readFile(file) {
    return new Promise((resolve, reject) => {
      // Check the file exists and can be read
      fs.access(file, fs.constants.R_OK, (err) => {
        if(err) return reject({message: 'Permissions error - Unable to read the file:' + file});

        // Read in the file
        fs.readFile(file, 'utf8', (err, data) => {

          if(err) return reject({message: 'Unable to read the file: ' + file});

          // Resolves with the file data
          resolve(data);
        }); // end readfile cb
      }); // end access cb
    });  // end promise
  }



  /**
   * Parse Data into CSV and remap columns
   *
   * @param {string} data - Large string to be converted from CSV to collection
   * @param {string} separator - The deliminator in the file to be parsed
   *
   * @returns {Promise|array} - Resolves with a collection of converted & remapped CSV data
   */
  parseFile(data, separator=',') {
    return new Promise((resolve, reject) => {


      let output = [];
      let parser = Parse({delimiter: separator, columns: true});

      parser.on('readable', () => {
        let record;
        while(record = parser.read()) {
          output.push(record);
        }
      });

      parser.on('error', (err) => {
        console.log('Unable to parse data: ', err);
        this.log('Unable to parse data', 'ERROR');
        reject({message: 'unable to parse data'});
      });

      // Remake column headers
      parser.on('finish', () => {
        resolve(output);
      });

      // Write data to parser
      parser.write(data);

      // Close the readable stream
      parser.end();
    });
  }
}

module.exports = Loader;