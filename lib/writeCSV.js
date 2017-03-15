"use strict";

// Load in dependencies
let _ = require('lodash');

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
$csvWrite.processRows = (data) => {

  // Loop over rows, determine order and add
  _.forEach(data, (row) => {

    let tempRow = [];

    // Add in order
    _.forEach($csvWrite.columns, (column) => {

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