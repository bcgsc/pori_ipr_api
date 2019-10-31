#!~/apps/node-v6.10.3-linux-x64/bin/node


/**
 * Module dependencies.
 */

const debug = require('debug')('ipr-api:server');
// const http = require('http');
const colors = require('colors');
 // Console colours
const API_VERSION = process.env.npm_package_version || '1.0';

// Start Server
console.log((`  BCGSC - Sync Worker ${API_VERSION}  `).blue.bold.bgWhite);
console.log('='.repeat(50).dim);
console.log((`Node Version: ${process.version}`).yellow);
console.log((`Running Environment: ${process.env.NODE_ENV || 'development'}`).green, '\n');

const TrackingSync = require('../app/modules/tracking/synchronizers')();
