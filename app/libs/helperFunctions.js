const _ = require('lodash');

/**
 * Checks that all target values exist
 * in an array
 *
 * @param {Array<any>} arr - Array of values to see if targets exist in
 * @param {Array<any>} targets - Array of values to check if they exist
 * @returns {boolean} - Returns true if all targets exist in array
 */
const includesAll = (arr, targets) => {
  return targets.every((value) => {
    return arr.includes(value);
  });
};

/**
 * Performs a case insensitice intersection on
 * two arrays of strings
 *
 * @param {Array<string>} array1 - First array of strings
 * @param {Array<string>} array2 - Second array of strings
 * @returns {Array<string>} - Returns a new array of intersecting values
 */

const caseInsensitiveIntersect = (array1, array2) => {
  return _.intersectionBy(array1, array2, _.lowerCase);
};

module.exports = {
  includesAll,
  caseInsensitiveIntersect,
};
