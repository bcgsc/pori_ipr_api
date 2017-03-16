"use strict";

// Load in dependencies
let _ = require('lodash');


class csvWrite {

  constructor(input) {
    this.output = "";
    this.input = input;

    // First do header
    this.header(input[0]);

    // ProcessRows
    this.processRows(input);
  }

  header(row) {
    this.columns = _.keys(row); // Determine the columns
    this.append(_.join(this.columns)); // Write the header row
  }

  append(string) {
    this.output += string; // Write the string
    this.output += "\n"; // Add new line break
  }

  processRows(data, filter=[]) {
    // Loop over rows, determine order and add
    _.forEach(data, (row) => {

      let tempRow = [];

      // Add in order
      _.forEach(this.columns, (column) => {

        if(filter.indexOf(column) > -1) return; // Skip column if it exists in the filter

        // Add in order
        if(typeof row[column] === 'number') tempRow.push(row[column]); // Number
        if(row[column].indexOf && row[column].indexOf(",") > -1 ) tempRow.push('"' + row[column] + '"'); // Check for commas in value!
        if(row[column].indexOf && row[column].indexOf(",") === -1 ) tempRow.push(row[column]);
      });

      this.append(tempRow);
    });
  }

  raw() {
    return this.output;
  }

}

module.exports = csvWrite;

/*
let $csvWrite = {};
$csvWrite.output = "";

// Create header row and write
$csvWrite.header = (row) => {
  $csvWrite.columns = _.keys(row); // Determine the columns
  $csvWrite.append(_.join($csvWrite.columns)); // Write the header row
};

// Write a row to the output
$csvWrite.append = (string) => {
  $csvWrite.output += string; // Write the string
  $csvWrite.output += "\n"; // Add new line break
};

// Process over the rows
$csvWrite.processRows = (data, filter=[]) => {

  // Loop over rows, determine order and add
  _.forEach(data, (row) => {

    let tempRow = [];

    // Add in order
    _.forEach($csvWrite.columns, (column) => {

      if(filter.indexOf(column) > -1) return; // Skip column if it exists in the filter

      // Add in order
      if(row[column].indexOf(",") > -1 )tempRow.push('"' + row[column] + '"'); // Check for commas in value!
      if(row[column].indexOf(",") === -1 )tempRow.push(row[column]);
    });

    $csvWrite.append(tempRow);
  });
};

// Return CSV string
module.exports = (input) => {

  // First do header
  $csvWrite.header(input[0]);

  // ProcessRows
  $csvWrite.processRows(input);

  return $csvWrite.output;

};
*/