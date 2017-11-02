"use strict";

const https     = require('https');
const db        = require(process.cwd() + '/app/models');
const nconf     = require('nconf').argv().env().file({file: process.cwd() + '/config/config.json'});
const _         = require('lodash');
const request   = require('request');


const host      = "https://lims16.bcgsc.ca";
const basePath  = "/alpha/limsapi";

let $lims = {};


/**
 * Retrieve sample results based on POGID
 *
 *
 * @param {string|array} pogid - The patient identifier POGnnn
 * @returns {Promise}
 */
$lims.sample = (pogid) => {
  return new Promise((resolve, reject) => {
    
    // Build base of query
    let body = {
      filters: {
        op: "or",
        content: []
      }
    };
    
    // Convert string pogid to array
    if(typeof pogid === 'string') {
      pogid = [pogid];
    }
    
    // Create array of POGIDs to search for
    _.forEach(pogid, (p) => {
      body.filters.content.push({
        op: "=",
        content: {
          field: 'participant_study_id',
          value: p
        }
      })
    });
    
    // Make Request
    request({
      method: 'POST',
      uri: host + basePath + '/sample',
      gzip: true,
      body: JSON.stringify(body)
    },
      (err, res, body) => {
        
        if(err) {
          reject({message: 'Unable to query lims for POG sample data: ' + err.message, cause: err});
        }
        
        if(!err) {
          resolve(JSON.parse(body));
        }
      
      })
      .auth('bpierce', 'k4tYp3Rry~', true);
    
  });
};

/**
 * Get library data from LIMS
 *
 * @param {string|array} libraries - Libraries to get details for
 * @returns {Promise}
 */
$lims.library = (libraries) => {
  
  if(libraries.length === 0) throw new Error("Must be searching for 1 or more libraries");
  
  return new Promise((resolve, reject) => {
    
    if(typeof libraries === 'string') {
      libraries = [libraries];
    }
  
    let body = {
      filters: {
        op: "in",
        content: {
          field: "name",
          value: libraries
        }
      }
    };
    
    
    request({
      method: 'POST',
      uri: host + basePath + '/library',
      gzip: true,
      body: JSON.stringify(body)
    },
      (err, res, body) => {
        if(err) {
          reject({message: 'Unable to query lims for library data: ' + err.message, cause: err});
        }
  
        if(!err) {
          resolve(JSON.parse(body));
        }
      })
      .auth('bpierce', 'k4tYp3Rry~');
    
  });
  
};

$lims.illuminaRun = (libraries) => {
  
  if(libraries.length === 0) throw new Error('Must be searching for 1 or more libraries.');
  
  return new Promise((resolve, reject) => {
  
    let body = {
      filters: {
        op: 'or',
        content: [
          {
            op: "in",
            content: {
              field: "library",
              value: libraries
            }
          },
          {
            op: "in",
            content: {
              field: "multiplex_library",
              value: libraries
            }
          }
        ]
      }
    }
    
    request({
      method: 'POST',
      uri: host + basePath + '/illumina_run',
      gzip: true,
      body: JSON.stringify(body)
    },
      (err, res, body) => {
        if(err) {
          reject({message: 'Unable to query lims for illumina data: ' + err.message, cause: err});
        }
  
        if(!err) {
          resolve(JSON.parse(body));
        }
      })
      .auth('bpierce', 'k4tYp3Rry~');
  
  });
};

module.exports = $lims;