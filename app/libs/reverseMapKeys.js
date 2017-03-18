"use strict";
let _ = require('lodash'),
  colors = require('colors');

module.exports = (input, keyMap) => {

  let output = [];

  // swap keys and values
  keyMap = swap(keyMap);

  for(let k in input) {
    // Get values
    output[k] = _.mapKeys(input[k], (v, key) => {

      // Unhandled colons - Check to see if double or single colons exists and are not yet handled!
      if(key.indexOf(':') !== -1 && !(key.replace(':', '~') in keyMap) && !(key.replace('::', '~') in keyMap)) {
        console.log(colors.bgRed(colors.white("INCOMPATIBLE CHARACTER FOUND")));
      }

      // Replace double colons with tilde
      if(key.indexOf('~') !== -1) key = key.replace('~', '::');

      // Remap Keys
      if(key in keyMap) return keyMap[key];
      if(!(key in keyMap)) return key;

    });
  }

  return output;
};

function swap(input){
  let ret = {};
  for(let key in input){
    ret[input[key]] = key;
  }
  return ret;
}