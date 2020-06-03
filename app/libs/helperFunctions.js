/**
 * Checks that all target values exist
 * in an array
 *
 * @param {Array<any>} arr - Array of values to see if targets exist in
 * @param {Array<any>} targets - Array of values to check if they exist
 * @returns {boolean} - Returns true if all targets exist in array
 */
const existsChecker = (arr, targets) => {
  return targets.every((value) => {
    return arr.includes(value);
  });
};

module.exports = {
  existsChecker,
};
