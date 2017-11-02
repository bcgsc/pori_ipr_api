"use strict";
// server.js

// BASE SETUP
// =========================================================================


// API Version
const API_VERSION   = '1.0';
const minimist      = require('minimist');


// Set environment based on config first.
if(process.env.NODE_ENV === undefined || process.env.NODE_ENV === null) {
  // Get from command line args
  const args = minimist(process.argv.slice(2));
  if(args.env) process.env.NODE_ENV = args.env;
  if(!args.env) process.env.NODE_ENV = 'production';
}
const CONFIG        = require('./config/'+process.env.NODE_ENV+'.json');

// Call packages required
const bodyParser    = require('body-parser');   // Body parsing lib
const colors        = require('colors');        // Console colours
const fs            = require('fs');            // File System access
const nconf         = require('nconf').argv().env().file({file: './config/config.json'});
const logger        = require('./lib/log');       // Load logging library

process.logger = logger;

const limsPathology = require(process.cwd() + '/app/modules/tracking/syncronizers/limsPathology');