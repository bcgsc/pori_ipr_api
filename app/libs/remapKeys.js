"use strict";
let _ = require('lodash');

module.exports = (input, keyMap) => {
  
  let output = [];
  
  for(let k in input) {
    // Get values
    output[k] = _.mapKeys(input[k], (v, key) => {
      if(key in keyMap) return keyMap[key];
      if(!(key in keyMap)) return key;
    });
  }
  
  return output;
}
