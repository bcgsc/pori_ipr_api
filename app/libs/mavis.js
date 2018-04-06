"use strict";

// Dependencies
let db = require(process.cwd() + '/app/models'),
  fs = require('fs'),
  d3 = require('d3-dsv'),
  _ = require('lodash'),
  Q = require('q');

let baseDir;

/*
 * Parse MAVIS Summary File
 *
 * @param string mavisFile - name of TSV file for given MAVIS summary
 *
 */
let parseMavisFile = (report, mavisFile) => {

  // Create promise
  let deferred = Q.defer();

  // Read in TSV file
  fs.readFile(mavisFile, (err, data) => {
    
    if(err) {
      console.log('Unable to find MAVIS TSV file', err);
      deferred.reject({loader: 'MAVISSummary', message: 'Unable to find the MAVIS summary file: ' + mavisFile, result: false});
    }
    
    // Parse TSV file
    let parsedMavisSummary = d3.tsvParse(data.toString());
    
    // Formatting summaries to be inserted into db
    let mavisRecords = _.map(parsedMavisSummary, function(record) {
      return {product_id: record.product_id, pog_id: report.pog_id, pog_report_id: report.id, summary: JSON.stringify(record)};
    }); 
    
    // Send data to
    deferred.resolve(mavisRecords);
  });

  return deferred.promise;

};

/**
 * MAVIS Summary - MAVIS Summary Loader
 *
 * Create DB entries for MAVIS summaries. Parse in CSV values, mutate, insert.
 *
 * @param {object} report - POG report model object
 * @param {string} source - file path to MAVIS summary
 * @param {list}   productIds - list of MAVIS product ids to add to database
 *
 */
 module.exports = {

  addMavisSummary: (report, source, productIds) => {

    // Create promise
    let deferred = Q.defer();

    // Wait for all promises to be resolved
    parseMavisFile(report, source)
    .then(
      (results) => {
        // filter results by product id
        let createRecords = _.filter(_.flattenDepth(results,2), function(record) {
          return _.includes(productIds, record.product_id);
        });
        // Load into Database
        return db.models.mavis.bulkCreate(createRecords);
      },
      (error) => {
        throw new Error('Unable to process MAVIS summary file.');
    })
    .then(
      (result) => {
        deferred.resolve(result);  
      },
      // Problem creating DB entries
      (err) => {
          throw new Error('Unable to create MAVIS summary database entries.');
          
    })
    .catch((error) => {
      deferred.reject({message: error.message});
    });
    
    return deferred.promise;
  }
};
