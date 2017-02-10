"use strict";
// Set Env
process.env.NODE_ENV = 'test';

// Dependencies
let recursive = require('recursive-readdir');
let _ = require('lodash');


let chai = require('chai'),
  chaiHttp = require('chai-http'),
  server = require(process.cwd() + '/server.js'),
  should = chai.should(),
  Q = require('q');

chai.use(chaiHttp);


// Index for orderly execution of unit tests
require('./exclude/loadPog.js').then(
  (success) => {

    console.log('Successfully loaded the pog.', success);

    require('./exclude/pog.js'); // Must be first
    require('./exclude/session.js');

    // All Others

    // Retrieve test files
    recursive(process.cwd() +'/test', (err, files) => {

      files.forEach((file) => {

        if(file.indexOf('exclude') !== -1) return;
        if(file.indexOf('tests.js') !== -1) return;
        if(file.indexOf('.svn') !== -1) return;

        // Require in additional tests
        require(file);
      });

    });


  },
  (err) => {
    console.log('Unable to load POG.');
  }
);