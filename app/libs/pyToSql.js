const map = {
  inf: '+infinity',
  '-inf': '-infinity',
  NaN: null,
  NAN: null,
  nan: null,
  NA: null,
  na: null,
  Na: null,
  Yes: true,
  No: false,
  yes: true,
  no: false,
};

/**
 * Map Python int & data values to SQL-safe values
 *
 * @param {string|object} input - Input value to be matched against
 * @param {array} [cols] - Array of cols to be remapped
 * @returns {string|object} - remapped text or input if not found
 */
module.exports = (input, cols) => {
  // Object with multiple columns to be mapped
  if (cols !== undefined && cols.length > 0) {
    // Loop over columns to be converted
    cols.forEach((val) => {
      // Confirm column is in input hashmap, and in map hashmap.
      if (val in input && input[val] in map) {
        input[val] = map[input[val]]; // Remap value
      }
    });

    // Return back object
    return input;
  }

  // Single input value
  if (cols === undefined && (typeof input !== 'object')) {
    if (input in map) {
      return map[input];
    }
    return input;
  }

  throw new Error('PythonToSQL conversion given incorrect input type');
};
