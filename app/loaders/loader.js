const fs = require('fs');
const parse = require('csv-parse/lib/sync');

class Loader {
  /**
   * Loader Class Wrapper
   * Provides common functions for loaders to extend
   *
   * @param {string} directoryBase - Base directory
   * @param {string} directoryCsv - CSV directory
   * @param {string} directoryImage - Image directory
   * @param {object} pog - POG report model object
   * @param {object} report - Report object
   * @param {object} options - Options for loading
   */
  constructor(directoryBase, directoryCsv, directoryImage, pog, report, options = {}) {
    this.directory = {base: directoryBase, csv: directoryCsv, image: directoryImage};
    this.name = ['loader'];
    this.report = report;
    this.pog = pog;
    this.options = options;
  }

  /**
   * Read and retrieve a file
   * Checks for the existence of a file and returns the data
   *
   * @param {string} file - File location
   * @returns {Promise.<string>} - Returns the content of the file
   */
  async readFile(file) {
    // Check the file exists and can be read
    fs.accessSync(file, fs.R_OK);
    // Read in the file
    return fs.readFileSync(file, 'utf-8');
  }

  /**
   * Parse Data into CSV and remap columns
   *
   * @param {string} data - Large string to be converted from CSV to collection
   * @param {string} separator - The deliminator in the file to be parsed
   *
   * @returns {Promise.<Array.<string>>} - Returns a collection of converted & remapped CSV data
   */
  async parseFile(data, separator = ',') {
    return parse(data, {delimiter: separator, columns: true});
  }
}

module.exports = Loader;
