"use strict";

let _ = require('lodash');

const map = {
  "inf": "+infinity",
  "-inf": "-infinity",
  "NaN": null,
  "nan": null,
  "na": null
};

/**
 * Map Python int & data values to SQL-safe values
 *
 * @param {string|object} input - Input value to be matched against
 * @param {array} cols -
 * @returns {string|object} - remapped text or input if not found
 */
module.exports = (input, cols) => {

  // Object with multiple columns to be mapped
  if(cols !== undefined && cols.length > 0) {

    // Loop over columns to be converted
    _.forEach(cols, (v) => {
      // Confirm column is in input hashmap, and in map hashmap.
      if(v in input && input[v] in map) input[v] = map[input[v]]; // Remap value
    });

    // Return back object
    return input;
  }

  // Single input value
  if(cols === undefined && (typeof input !== 'object')) {
    if (input in map) return map[input];
    if (!(input in map)) return input;
  }

  throw new Error('PythonToSQL conversion given incorrect input type');
};