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

  db.models.genomicAlterationsIdentified.findAll(opts).then(
    (results) => {

      let entries = [];

      // Extract raw values into preMapped
      _.forEach(results, (v) => {
        entries.push(v.get().geneVariant);
      });

      let file = 'genomic_alt_identified';

      // Construct data
      let data = "gene_variant_1,gene_variant_2,gene_variant_3,gene_variant_4,gene_variant_5\n";
      let chunked = _.chunk(entries, 5);
      _.forEach(chunked, (v) => {
        data += _.join(v, ',')+"\n";
      });

      // Remove file, then write
      fs.unlink(directory.export + '/' + file + '.csv' ,(err) => {
        // Did unlink fail?
        if(err) return deferred.reject({stage: 'summary.genomicAlterationsIdentified', status: false, data: err});
        console.log('Unlinked', directory.export + '/' + file + '.csv');

        let writer_detail = fs.writeFile(directory.export + '/' + file + '.csv', data, (err) => {
          if(err) console.log('Error in: ', file, err);
          if(!err) console.log('Successfully wrote: ', file);

          deferred.resolve({stage: 'summary.genomicAlterationsIdentified', status: true});
        });
      });


    },
    (err) => {
      console.log('Failed to query');
      deferred.reject({stage: 'summary.genomicAlterationsIdentified', status: false, data: err});
    }
  );

  return deferred.promise;

};