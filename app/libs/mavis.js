const fs = require('fs');
const d3 = require('d3-dsv');
const db = require('../models');

/**
 * Parse MAVIS Summary File
 *
 * @param {object} report - A report
 * @param {string} mavisFile - Name of TSV file for given MAVIS summary
 * @returns {Array.<object>} - Returns an array of mavis records
 */
const parseMavisFile = async (report, mavisFile) => {
  // Check that MAVIS summary exists
  if (!fs.existsSync(mavisFile)) {
    throw new Error(`Failed to find MAVIS summary file: ${mavisFile}`);
  }

  // Read in TSV file
  const data = fs.readFileSync(mavisFile);
  
  // Parse TSV file
  const parsedMavisSummary = d3.tsvParse(data.toString());
    
  // Formatting summaries to be inserted into db
  const mavisRecords = parsedMavisSummary.map((record) => {
    return {
      product_id: record.product_id.split(';')[0],
      reportId: report.id,
      summary: JSON.stringify(record),
    };
  });

  return mavisRecords;
};

/**
 * MAVIS Summary - MAVIS Summary Loader
 *
 * Create DB entries for MAVIS summaries. Parse in CSV values, mutate, insert.
 *
 * @param {object} report - report model object
 * @param {list} sources - list of file paths to MAVIS summaries
 * @param {list} productIds - list of MAVIS product ids to add to database
 * @returns {Promise.<Array.<Model>>} - Returns an array of the mavis summary's created
 *
 */
const addMavisSummary = async (report, sources, productIds) => {
  // Parsing MAVIS files
  // Wait for all promises to be resolved
  const results = await Promise.all(
    sources.map((source) => {
      // Create Promise
      return parseMavisFile(report, source);
    })
  );

  // Union all parsed MAVIS files based on their product ids
  const mavisSummary = [];
  let found;
  results.forEach((summary) => {
    found = mavisSummary.find((value) => {
      return value.product_id === summary.product_id;
    });

    // Filter results for records to insert based on product id
    if (!found && productIds.includes(summary.product_id)) {
      mavisSummary.push(summary);
    }
  });

  // Load into Database
  return db.models.mavis.bulkCreate(mavisSummary);
};

module.exports = {
  addMavisSummary,
};
