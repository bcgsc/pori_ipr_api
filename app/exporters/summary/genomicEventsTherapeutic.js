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
        'createdAt',
        'updatedAt',
        'deletedAt'
      ]
    }
  };

  db.models.genomicEventsTherapeutic.findAll(opts).then(
    (results) => {

      let preMapped = [];

      // Extract raw values into preMapped
      _.forEach(results, (v) => {
        preMapped.push(v.get());
      });

      let file = 'genomic_events_thera_assoc';

      // Reverse Remap keys
      let mapped = reverseMapKeys(preMapped, nconf.get('summary:genomicEventsTherapeutic'));

      // Remove file, then write
      fs.unlink(directory.export + '/' + file + '.csv' ,(err) => {
        // Did unlink fail?
        if(err) return deferred.reject({stage: 'summary.genomicEventsTherapeutic', status: false, data: err});

        let data = new writeCSV(mapped).raw();

        let writer_detail = fs.writeFile(directory.export + '/' + file + '.csv', data, (err) => {
          if(err) console.log('Error in: ', file, err);

          deferred.resolve({stage: 'summary.genomicEventsTherapeutic', status: true});
        });
      });

    },
    (err) => {
      console.log('Failed to query');
      deferred.reject({stage: 'summary.genomicEventsTherapeutic', status: false, data: err});
    }
  );

  return deferred.promise;

};