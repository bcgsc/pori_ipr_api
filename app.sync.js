"use strict";
/*
 IPR-API - Integrated Pipeline Reports API

 COPYRIGHT 2016 MICHAEL SMITH GENOME SCIENCES CENTRE
 CONFIDENTIAL -- FOR RESEARCH PURPOSES ONLY
 
 Author: Brandon Pierce <bpierce@bcgsc.ca>
 Support JIRA ticket space: DEVSU

 This Node.JS script is designed to be run in ES6ES6 compliant mode

*/


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

//const limsPathology = require(process.cwd() + '/app/modules/tracking/syncronizers/limsPathology');
//const limsSequencing = require(process.cwd() + '/app/modules/tracking/syncronizers/limsSequencing');
//const bioappsSync = require(process.cwd() + '/app/modules/tracking/syncronizers/BioApps');
//const TestSyncro = require(process.cwd() + '/app/synchronizer/test');

const TrackingSync = require(process.cwd() + '/app/modules/tracking/synchronizers')();

