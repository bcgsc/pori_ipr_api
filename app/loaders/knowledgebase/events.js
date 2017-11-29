"use strict";

// Dependencies
let db = require(process.cwd() + '/app/models'),
  fs = require('fs'),
  dl = require('datalib'),
  remapKeys = require(process.cwd() + '/app/libs/remapKeys'),
  _ = require('lodash'),
  Q = require('q'),
  nconf = require('nconf').argv().env().file({file: process.cwd() + '/config/kbColumns.json'});


let remapStatus = (inputStatus) => {
  if(inputStatus === null) return "REQUIRES-REVIEW";
  if(inputStatus.match(/(v[0-9]*.[0-9]*.[0-9]*)/) !== null) return 'APPROVED';

  return inputStatus;

};
let mapUser = (inputUser) => {
  if(inputUser === null) return null;

  switch(inputUser) {
    case 'CRR':
      return 4;
      break;
    case 'MRJ':
      return 3;
      break;
    default:
      return null;
      break;
  }
};


/**
 * Parse KB Entries file
 *
 * @param {object} dir - Directory to locate the KB exports in
 * @param {object} logger - Logging utility instance
 * @param {object} options
 *
 * @returns {promise|object} - Resolves with object, Rejects with object
 */
module.exports = (dir, logger, options) => {

  // Create promise
  let deferred = Q.defer();

  // Setup Logger
  let log = logger.loader('KB-Import', 'Events');
  let file = options.events;
  
  if(!file) return reject({message: 'No events filename specified'});
  
  // Read in event entries
  let entries = dl.tsv(`${dir}/${file}`);

  _.forEach(entries, (e, i)=> {

    // Ignore deleted entries.
    if(e.status === 'RESOLVED-CAN-DELETE') return delete entries[i];

    // Do some remapping
    e.status = remapStatus(e.status);
    e.reviewedBy_id = mapUser(e.last_modified_by);
    e.in_version = (e.status !== null && e.status.match(/(v[0-9]*.[0-9]*.[0-9]*)/) !== null) ? e.status : null;

    // Write updated entry to array
    entries[i] = e;
  });

  log('Reading in '+ entries.length + ' entries.');

  //process.exit();

  // Add to Database
  db.models.kb_event.bulkCreate(entries).then(
    (result) => {
      log('Finished loading KB events table.', logger.SUCCESS);

      // Resolve Promise
      deferred.resolve(result);
    },
    (err) => {
      console.log(err.message);
      log('Failed to load KB events into DB', logger.ERROR);
      deferred.reject('Failed to load KB events into database.');
    }
  );

  return deferred.promise;

};
