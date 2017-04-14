"use strict";

// Dependencies
let db = require(process.cwd() + '/app/models'),
  fs = require('fs'),
  dl = require('datalib'),
  parse = require('csv-parse'),
  remapKeys = require(process.cwd() + '/app/libs/remapKeys'),
  _ = require('lodash'),
  Q = require('q'),
  nconf = require('nconf').argv().env().file({file: process.cwd() + '/config/kbColumns.json'});


let mapUser = (inputUser) => {
  if(inputUser === null) return null;

  if(inputUser.indexOf('+') !== -1) {
    inputUser = inputUser.split('+')[0].trim();
  }

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


let dbInsert = (entry, i) => {
  let deferred = Q.defer();

  db.models.kb_reference.create(entry).then(
    (result) => {
      deferred.resolve(true);
    },
    (err) => {
      console.log('SQL Error', err);
      deferred.reject(false);
    }
  );

  return deferred.promise;
};

/**
 * Parse KB Entries file
 *
 * @param {object} dir - Directory to locate the KB exports in
 * @param {object} logger - Logging utility instance
 * @returns {promise|object} - Resolves with object, Rejects with object
 */
module.exports = (dir, logger) => {

  // Create promise
  let deferred = Q.defer();

  // Setup Logger
  let log = logger.loader('KB-Import', 'References');

  // First parse in therapeutic
  let output = fs.createReadStream(dir + '/knowledge_base_references.csv');

  log('Reading in the knowledge_base_references.csv file.');

  // Parse file!
  let parser = parse({delimiter: ',', columns: true, relax_column_count: true},
    (err, entries) => {

      if(err) {
        console.log('Failed to parse CSV file', err);
        log('Failed to read CSV file');
        deferred.reject(false);
        return;
      }

      log('Entries to be processed: '+entries.length);

      _.forEach(entries, (e, i)=> {

        // Ignore deleted entries.
        if(e.status === 'RESOLVED-CAN-DELETE') return delete entries[i];

        // Do some remapping
        e.reviewedBy_id = mapUser(e.last_modified_by);
        if(e.status === null) e.status = 'REQUIRES-REVIEW';
        e.ref_id = e.id; // Move id to ref_id;
        e.sample_size = (typeof e.sample_size === 'string') ? null : e.sample_size;
        e.type = (e.type === '') ? null : e.type;

        delete entries[i].id; // delete id entry
        delete entries[i].update_comments;
        delete entries[i].last_modified_by;
        delete entries[i].last_reviewed_at;

        // Write updated entry to array
        entries[i] = e;
      });

      log('Processed entries, starting database insert');

      // Add to Database
      db.models.kb_reference.bulkCreate(entries).then(
        (result) => {
          log('Finished loading KB references table.', logger.SUCCESS)

          // Resolve Promise
          deferred.resolve(result);
        },
        (err) => {
          console.log(err.message);
          log('Failed to load KB references into DB', logger.ERROR)
          deferred.reject('Failed to load KB references into database.');
        }
      );
      /*
      let promises = [];

      _.forEach(entries, (e, i) => {

        promises.push(dbInsert(e));

      });


      Q.all(promises).then(
        (success) => {
          console.log('Succeeded with all inserts', success);
          deferred.resolve(true);
        },
        (err) => {
          console.log('Failed to insert references', err);
          deferred.reject(false);
        }
      );
      */
    }
  );

  // Pipe file through parser
  output.pipe(parser);

  output.on('error', (err) => {
    log('Unable to find required CSV file');
    deferred.reject({reason: 'sourceFileNotFound'});
  });


  /*

  */

  return deferred.promise;

};
