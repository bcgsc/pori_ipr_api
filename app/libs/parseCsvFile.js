const fs = require('fs');
const parse = require('csv-parse/lib/sync');

/**
 * Reads a csv file and returns the contents of the files as JSON objects
 *
 * @param {string} file - The path + the name of a csv file
 * @returns {Array.<object>} - Returns parsed csv file as an array of JSON objects
 */
const readFromCSV = async (file) => {
  const input = fs.readFileSync(file);
  return parse(input, {delimiter: ',', columns: true});
};

module.exports = {
  readFromCSV,
};
