"use strict";
let _ = require('lodash'),
    colors = require('colors');

module.exports = (input, keyMap) => {

  let output = [];

  for(let k in input) {
    // Get values
    output[k] = _.mapKeys(input[k], (v, key) => {

      // Unhandled colons - Check to see if double or single colons exists and are not yet handled!
      if(key.includes(':') && !(key.replace(':', '~') in keyMap) && !(key.replace('::', '~') in keyMap)) {
        console.log(colors.bgRed(colors.white("INCOMPATIBLE CHARACTER FOUND")));
      }

      // Replace double colons with tilde
      if(key.includes('::')) {
        key = key.replace('::', '~');
      }
      if(key.includes(':')) {
        key = key.replace(':', '~');
      }

      // Remap Keys
      if(key in keyMap) {
        return keyMap[key];
      } else {
        return key;
      }
    });
  }
  
  return output;
};