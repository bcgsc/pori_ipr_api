"use strict";

const db          = require(process.cwd() + '/app/models');
const lodash      = require('lodash');
const logger      = process.logger;
const p2s         = require(process.cwd() + '/app/libs/pyToSql');
const _           = require('lodash');

module.exports = {
  
  
  /**
   * Process Germline small mutation variants
   *
   * Takes in the germline report object and includes the id in each row's object
   *
   * @param {object} report - Germline report model object
   * @param {array} variants - Collection of germline small mutation variants
   *
   * @returns {Array} - Returns a collection of processed variants
   */
  processVariants: (report, variants) => {
    
    let processed_variants;
    
    // Map result values
    processed_variants = _.map(variants, (v) => {
      
      v.germline_report_id = report.id;
      v.cgl_category = p2s(v.cgl_category);
      v.preferred_transcript = p2s(v.preferred_transcript);
      v.gmaf = p2s(v.gmaf);
      
      return v;
    });
    
    return processed_variants;
  }
  
};