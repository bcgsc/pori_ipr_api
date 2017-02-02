"use strict";
// Set Env
process.env.NODE_ENV = 'test';

// Dependencies
let recursive = require('recursive-readdir');
let _ = require('lodash');

// Index for orderly execution of unit tests
require('./exclude/pog.js'); // Must be first
require('./exclude/session.js');

// All Others

// Retrieve route files
recursive(process.cwd() +'/test', (err, files) => {  
  
  files.forEach((file) => {
    
    if(file.indexOf('exclude') !== -1) return;
    if(file.indexOf('tests.js') !== -1) return;
    
    // Require in additional tests
    require(file);
  });
  
});
