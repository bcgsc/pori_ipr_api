"use strict";
/*
 * Loaders - Onboards CSV data into SQL databases
 *
 * Recursively works back g
 *
 */

let db = require(process.cwd() + '/app/models'),
  Q = require('q'),
  logger = require(process.cwd() + '/app/libs/logger'),
  _ = require('lodash'),
  fs = require('fs'),
  nconf = require('nconf').argv().env().file({file: process.cwd() + '/config/'+process.env.NODE_ENV+'.json'});

// Map of loaders
let loaders = [
  // Loaders
  'references',
  'events',
];

// Run loaders for a specified POGID
module.exports = (options={}) => {

  let log = logger.loader('KB-Import');

  // Started to onboard a POG Report
  log('Running Knowledge Base Import');

  let deferred = Q.defer(); // Create promise
  let promises = [];

  if(!options.directory) deferred.reject({error: 'directory option was not set and is required.'});

  // Loop over loader files and create promises
  loaders.forEach((file) => {
    promises.push(require('./' + file)(options.directory, logger));
  });

  // Wait for all loaders to finish!
  Q.all(promises)
    .done((result) => {
        // Check Results
        log('All loaders have completed.', logger.SUCCESS);
        // All good!
        deferred.resolve(true);
      },
      (error) => {
        // A loader failed
        let fail = {};

        // Log error
        log('Failed KB loading process.', logger.ERROR);
        console.log(error);

        if(error.reason && error.reason.indexOf('sourceFileNotFound') !== -1) fail.status = 400; // Bad POG source

        // Return fail
        deferred.reject(fail);
      }
    );
  return deferred.promise;
};
