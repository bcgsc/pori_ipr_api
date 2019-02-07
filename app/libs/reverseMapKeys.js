/**
 * Reverse map keys of an object
 *
 * @param {object} input - An object to have its keys reverse mapped
 * @param {object} keyMap - A keyMap object
 * @returns {Array.<object>} - Returns an array of reverse key mapped objects
 */
const reverseMap = (input, keyMap) => {
  const output = [];

  // swap keys and values
  keyMap = swap(keyMap);

  Object.entries(input).forEach(([k, v]) => {
    let newObj = {};
    Object.entries(v).forEach(([key, value]) => {
      // Unhandled colons - Check to see if double or single colons exists and are not yet handled!
      if (key.includes(':') && !(key.replace(':', '~') in keyMap) && !(key.replace('::', '~') in keyMap)) {
        throw new Error('Incompatible character found');
      }

      // Replace double colons with tilde
      if (key.includes('~')) {
        key = key.replace('~', '::');
      }

      // Remap Keys
      if (key in keyMap) {
        newObj[keyMap[key]] = value;
      } else {
        newObj[key] = value;
      }
    });
    output[k] = newObj;
    newObj = {};
  });

  return output;
};

/**
 * Swaps the keys and values of an object
 *
 * @param {object} input - An object to swap keys and values
 * @returns {object} - Returns an object with the keys and values swapped
 */
function swap(input) {
  const ret = {};
  Object.entries(input).forEach(([key, value]) => {
    ret[value] = key;
  });
  return ret;
}

module.exports = reverseMap;
