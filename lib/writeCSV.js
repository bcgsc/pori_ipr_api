"use strict";

// Load in dependencies
let _ = require('lodash');


class csvWrite {

  constructor(input, options={}) {
    this.output = "";
    this.input = input;
    this.separator = options.separator || ",";
    this.quote = (options.quote !== undefined) ? options.quote : true;
    this.headerLength = 0;

    // First do header
    this.header(input[0]);

    // ProcessRows
    this.processRows(input);
  }

  header(row) {
    this.columns = _.keys(row); // Determine the columns
    this.headerLength = this.columns.length;
    this.append(_.join(this.columns, this.separator)); // Write the header row
  }

  append(row) {
    if(row.match(/\t/g).length > this.headerLength) {
      console.log(row);
      throw new Error('Too many tabs');
    }
    this.output += row; // Write the string
    this.output += "\n"; // Add new line break
  }

  processRows(data, filter=[]) {
    // Loop over rows, determine order and add
    _.forEach(data, (row) => {

      if(row === null) return; // Job done, no data!

      let tempRow = [];

      // Add in order
      _.forEach(this.columns, (column) => {

        if(filter.indexOf(column) > -1) return; // Skip column if it exists in the filter
        if(row[column] === null) return tempRow.push("");

        // Add in order
        if(typeof row[column] === 'number') return tempRow.push(row[column]); // Number

        if(this.quote) {
          if(row[column].indexOf && row[column].indexOf(",") > -1) return tempRow.push('"' + row[column] + '"'); // Check for commas in value!
          if(row[column].indexOf && row[column].indexOf(",") === -1) return tempRow.push(row[column]);
        } else {
          if(row[column].indexOf) return _.trim(tempRow.push(row[column].replace(/\n/g, '').replace(/\t/g, ''))); // Check for commas in value!
        }

      });

      if(tempRow.length > this.headerLength) {
        console.log('Errant row', row);
        throw new Error ('Row has more columns than there are headers (' + row.length + ' instead of ' + this.headerLength + ')');
      }

      this.append(_.join(tempRow, this.separator));
    });
  }

  raw() {
    return this.output;
  }

}

module.exports = csvWrite;
