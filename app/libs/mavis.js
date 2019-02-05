const fs = require('fs');
const d3 = require('d3-dsv');
const db = require('../../../app/models');

/*
 * Parse MAVIS Summary File
 *
 * @param string mavisFile - name of TSV file for given MAVIS summary
 *
 */
const parseMavisFile = async (report, mavisFile) => {

  // Read in TSV file
  const data = fs.readFileSync(mavisFile);
    
  // Parse TSV file
  const parsedMavisSummary = d3.tsvParse(data.toString());
    
  // Formatting summaries to be inserted into db
  const mavisRecords = parsedMavisSummary.map(record => {
      return {product_id: record.product_id.split(';')[0], pog_id: report.pog_id, pog_report_id: report.id, summary: JSON.stringify(record)};
    }); 

  return mavisRecords;
};

/**
 * MAVIS Summary - MAVIS Summary Loader
 *
 * Create DB entries for MAVIS summaries. Parse in CSV values, mutate, insert.
 *
 * @param {object} report - POG report model object
 * @param {list} source - list of file paths to MAVIS summaries
 * @param {list}   productIds - list of MAVIS product ids to add to database
 *
 */

const addMavisSummary = async (report, sources, productIds) => {
    // Parsing MAVIS files
    // Wait for all promises to be resolved
    Promise.all([]);
    //??? Here I am
    Q.all(_.map(sources, (source) => {
      // Check that MAVIS summary exists
      if(!fs.existsSync(source)) {
        // Warn MAVIS summary was not found
        return log('Failed to find MAVIS summary file: ' + source, logger.WARNING);
      }
    
      // Create Promise
      return parseMavisFile(report, source);

    }))
    .then(
      (results) => {

        // Union all parsed MAVIS files based on their product ids
        let mavisSummary;
        _.each(results, function(summary) {
          mavisSummary = _.unionBy(mavisSummary, summary, 'product_id');
        });

        // Filter results for records to insert based on product id
        let createRecords = _.filter(mavisSummary, function(record) {
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

module.exports = {
  addMavisSummary,
};
