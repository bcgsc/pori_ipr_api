"use strict";

let colors = require('colors');

// Returned Logger
let logger = (prefix) => {
  
  return (content, type=null) => {
    
    if(type == 'error') console.log(colors.bgRed(colors.stripColors(prefix) + ' ' + content));
    
    if(type == null) console.log(prefix + ' ' + content);
    
    if(type == true || type == 'success') console.log(prefix + ' ' + colors.bgGreen(content));
    
    if(type == 'warning') console.log(prefix + ' ' + colors.bgYellow(content));
  }
  
}

// Return
module.exports = {
  
  // Type definitions
  ERROR: 'error',
  INFORMATION: null,
  DEBUG: 'debug',
  SUCCESS: 'success',
  WARNING: 'warning',
  
  // Loader Data
  loader: (POG, loader=null) => {
    
    let prefix = ('['+(POG).green + ']['+'Loader'.cyan+']' + ((loader) ? '['+(loader).yellow+']' : '')).dim;
    
    return logger(prefix);
  },
  
  // Routing Logger
  route: (url) => {
    console.log(colors.dim('['+'Route'.green+']') + ' ' + 'Url requested: ' + url);
  },
}
