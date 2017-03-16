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
        'subtyping',
        'createdAt',
        'updatedAt',
        'deletedAt'
      ]
    },
    limit: 1
  };

  db.models.tumourAnalysis.findOne(opts).then(
    (result) => {

      let preMapped = [result.get()];

      // Reverse Remap keys
      let mapped = reverseMapKeys(preMapped, nconf.get('summary:tumourAnalysis'));

      let file = 'patient_tumour_analysis';

      // Remove file, then write
      fs.unlink(directory.export + '/' + file + '.csv' ,(err) => {
        // Did unlink fail?
        if(err) return deferred.reject({stage: 'summary.tumourAnalysis', status: false, data: err});
        console.log('Unlinked', directory.export + '/' + file + '.csv');

        let data = new writeCSV(mapped).raw();

        let writer_detail = fs.writeFile(directory.export + '/' + file + '.csv', data, (err) => {
          if(err) console.log('Error in: ', file, err);
          if(!err) console.log('Successfully wrote: ', file);

          deferred.resolve({stage: 'summary.tumourAnalysis', status: true});
        });
      });
    },
    (err) => {
      console.log('Failed to query');
      deferred.reject({stage: 'summary.patientInformation', status: false, data: err});
    }
  );

  return deferred.promise;

};