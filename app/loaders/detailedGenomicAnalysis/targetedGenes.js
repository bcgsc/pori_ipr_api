"use strict";

// Dependencies
let db = require(process.cwd() + '/app/models'),
  fs = require('fs'),
  parse = require('csv-parse'),
  remapKeys = require(process.cwd() + '/app/libs/remapKeys'),
  _ = require('lodash'),
  Q = require('q'),
  nconf = require('nconf').argv().env().file({file: process.cwd() + '/config/config.json'});

/*
 * Parse Targeted Gene Report File
 *
 *
 * @param object POG - POG model object
 *
 */
module.exports = (POG, logger) => {

  // Create promise
  let deferred = Q.defer();

  // Setup Logger
  let log = logger.loader(POG.POGID, 'DetailedGenomicAnalysis.TargetedGenes');

  // First parse in therapeutic
  let output = fs.createReadStream(nconf.get('paths:data:POGdata') + '/' + POG.POGID + '/JReport/Genomic/JReport_CSV_ODF/probe_summary.csv')

  log('Found and read probe_summary.csv file.')

  // Parse file!
  let parser = parse({delimiter: ',', columns: true},
    (err, result) => {

      // Was there a problem processing the file?
      if(err) {
        log('Unable to parse CSV file');
        console.log(err);
        deferred.reject({reason: 'parseCSVFail'});
      }

      // Remap results
      let entries = [];
      let entriesMap = {};
      // Map needed DB column values
      _.forEach(result, (v, k) => {

        if(v.Gene + '-' + v.Variant in entriesMap) return;

        let entry = {
          pog_id: POG.id,
          gene: v.Gene,
          variant: v.Variant,
          sample: v.Sample
        }

        entries.push(entry); // Add entry
        entriesMap[v.Gene + '-' + v.Variant] = true; // Add entry to map to prevent multiple identical entries

      });

      // Add to Database
      db.models.targetedGenes.bulkCreate(entries).then(
        (result) => {
          log('Finished Targeted Gene Report.', logger.SUCCESS)

          // Resolve Promise
          deferred.resolve(result);
        },
        (err) => {
          log('Failed to load Targeted Gene Report.', logger.ERROR)
          deferred.reject('Failed to load Targeted Gene Report.');
        }
      );
    }
  );

  // Pipe file through parser
  output.pipe(parser);

  output.on('error', (err) => {
    log('Unable to find required CSV file');
    deferred.reject({reason: 'sourceFileNotFound'});
  });

  return deferred.promise;

}
