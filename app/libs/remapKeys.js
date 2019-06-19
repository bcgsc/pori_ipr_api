/**
 *
 * Remaps the keys of an object
 *
 * @param {Array.<object>} input - An array of objects to remap keys for
 * @param {object} keyMap - A keyMap object
 * @returns {Array.<object>} - Returns an array of objects with remapped keys
 */

const remapKeys = (input, keyMap) => {
  const output = input.map((v) => {
    const newObj = {};
    Object.entries(v).forEach(([key, value]) => {
      // Unhandled colons - Check to see if double or single colons exists and are not yet handled!
      if (key.includes(':') && !(key.replace(':', '~') in keyMap) && !(key.replace('::', '~') in keyMap)) {
        throw new Error(`Incompatible character found (${key})`);
      }
      // Replace double colons with tilde
      if (key.includes('::')) {
        key = key.replace('::', '~');
      }
      if (key.includes(':')) {
        key = key.replace(':', '~');
      }

      // Remap Keys
      if (key in keyMap) {
        newObj[keyMap[key]] = value;
      } else {
        newObj[key] = value;
      }
    });
    return newObj;
  });

  return output;
};

module.exports = remapKeys;
