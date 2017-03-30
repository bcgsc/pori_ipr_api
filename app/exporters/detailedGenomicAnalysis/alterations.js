"use strict";

let db = require(process.cwd() + '/app/models'),
  Q = require('q'),
  remapKeys = require(process.cwd() + '/app/libs/remapKeys'),
  reverseMapKeys = require(process.cwd() + '/app/libs/reverseMapKeys'),
  _ = require('lodash'),
  writeCSV = require(process.cwd() + '/lib/writeCSV'),
  fs = require('fs'),
  nconf = require('nconf').argv().env().file({file: process.cwd() + '/config/columnMaps.json'});

module.exports = (pog, directory) => {

  let deferred = Q.defer();

  let opts = {
    where: {
      pog_id: pog.id
    },
    attributes: {
      exclude: [
        'id',
        'ident',
        'dataVersion',
        'pog_id',
        'newEntry',
        'approvedTherapy',
        'createdAt',
        'updatedAt',
        'deletedAt',
        'kb_newEntry'
      ]
    },
    order: 'gene ASC'
  };

  // Get First Table
  db.models.alterations.findAll(opts).then(
    (results) => {

      let preMapped = [];

      _.forEach(results, (v) => {
        preMapped.push(v.get());
      });

      // Reverse Remap keys
      let mapped = reverseMapKeys(preMapped, nconf.get('detailedGenomicAnalysis:alterations'));

      let processAlteration = (alt) => {
        delete alt.alterationType;
        return alt;
      };

      // Sort into types
      let alterations = {
        clin_rel_known_alt_detailed: [],  // Therapeutic
        clin_rel_known_biol_detailed: [], // Biological
        clin_rel_known_diag_detailed: [], // Diagnostic
        clin_rel_known_prog_detailed: [], // Prognostic
        clin_rel_unknown_alt_detailed: [] // Unknown/Uncharacterized
      };

      // loop over and drop into categories
      _.forEach(mapped, (a) => { //  {therapeutic,prognostic,diagnostic,biological,unknown}
        if(a.alterationType === 'therapeutic') alterations.clin_rel_known_alt_detailed.push(processAlteration(a));
        if(a.alterationType === 'biological') alterations.clin_rel_known_biol_detailed.push(processAlteration(a));
        if(a.alterationType === 'diagnostic') alterations.clin_rel_known_diag_detailed.push(processAlteration(a));
        if(a.alterationType === 'prognostic') alterations.clin_rel_known_prog_detailed.push(processAlteration(a));
        if(a.alterationType === 'unknown') alterations.clin_rel_unknown_alt_detailed.push(processAlteration(a));
      });

      // Write CSV
      _.forEach(alterations, (group, file) => {
        // Write each to a file in the specified directory

        // Remove file, then write
        fs.unlink(directory.export + '/' + file + '.csv' ,(err) => {
          // Did unlink fail?
          if(err) return deferred.reject({stage: 'detailedGenomicAnalysis.alterations', status: false, data: err});

          let data = new writeCSV(group, ['kb_data']).raw();

          let writer_detail = fs.writeFile(directory.export + '/' + file + '.csv', data, (err) => {
            if(err) console.log('Error in: ', file, err);
          });
        });

        // Remove file, then write
        fs.unlink(directory.export + '/' + file.replace('_detailed', '') + '.csv' ,(err) => {

          // Did unlink fail?
          if (err) return deferred.reject({stage: 'detailedGenomicAnalysis.alterations', status: false, data: err});

          let data = new writeCSV(group, ['KB_event_key', 'KB_ENTRY_key']).raw();

          // Same as above without two keys: KB_event_key,	KB_ENTRY_key
          let writer = fs.writeFile(directory.export + '/' + file.replace('_detailed', '') + '.csv', data, (err) => {
            if (err) console.log('Error in: ', file.replace('_detailed', ''), err);
          });

        }); // End unlink non-detailed

      }); // End looping over all therapeutic files

      deferred.resolve({stage: 'detailedGenomicAnalysis.alterations', status: true});

    },
    (err) => {
      console.log('Failed to query');
      deferred.reject({stage: 'detailedGenomicAnalysis.alterations', status: false, data: err});
    }
  );

  return deferred.promise;

};