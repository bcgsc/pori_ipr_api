"use strict";

const https     = require('https');
const db        = require(process.cwd() + '/app/models');
const nconf     = require('nconf').argv().env().file({file: process.cwd() + '/config/config.json'});
const _         = require('lodash');
const request   = require('request');
const gin       = require(process.cwd() + '/lib/ginCredentials');
let logger      = process.logger;


const host      = "https://lims13.bcgsc.ca";
const basePath  = "/prod/limsapi";

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
    $lims.getAuthCredentials().then((credentials) => {
      request({
        method: 'POST',
        uri: host + basePath + '/sample',
        gzip: true,
        body: body,
        json: true
      },
        (err, res, body) => {
          if (res.statusCode == 200 && !err) {
            resolve(body);
          } else {
            if(res.statusCode == 504 || res.statusCode == 502) logger.error('Failed to connect to LIMS API due to Gateway Time-out');

            if(err) {
              reject({message: 'Unable to query LIMS for sample data: ' + err.message, cause: err});
            } else {
              reject({message: 'Unable to query LIMS for sample data: returned with status code ' + res.statusCode});
            }
          }
        })
        .auth(credentials.username, credentials.password);
    }).catch((err) => {
      reject({message: 'Unable to retrieve credentials to access LIMS API: ' + err.message, cause: err});
    });
    
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
    
    $lims.getAuthCredentials().then((credentials) => {
      request({
        method: 'POST',
        uri: host + basePath + '/library',
        gzip: true,
        body: JSON.stringify(body)
      },
        (err, res, body) => {
          if (res.statusCode == 200 && !err) {
            resolve(JSON.parse(body));
          } else {
            if(res.statusCode == 504 || res.statusCode == 502) logger.error('Failed to connect to LIMS API due to Gateway Time-out');

            if(err) {
              reject({message: 'Unable to query LIMS for library data: ' + err.message, cause: err});
            } else {
              reject({message: 'Unable to query LIMS for library data: returned with status code ' + res.statusCode});
            }
          }
        })
        .auth(credentials.username, credentials.password);
    }).catch((err) => {
      reject({message: 'Unable to retrieve credentials to access LIMS API: ' + err.message, cause: err});
    });
    
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

    $lims.getAuthCredentials().then((credentials) => {
      request({
        method: 'POST',
        uri: host + basePath + '/illumina_run',
        gzip: true,
        body: JSON.stringify(body)
      },
        (err, res, body) => {
          if (res.statusCode == 200 && !err) {
            resolve(JSON.parse(body));
          } else {
            if(res.statusCode == 504 || res.statusCode == 502) logger.error('Failed to connect to LIMS API due to Gateway Time-out');

            if(err) {
              reject({message: 'Unable to query LIMS for Illumina run data: ' + err.message, cause: err});
            } else {
              reject({message: 'Unable to query LIMS for Illumina run data: returned with status code ' + res.statusCode});
            }
          }
        })
        .auth(credentials.username, credentials.password);
    }).catch((err) => {
      reject({message: 'Unable to retrieve credentials to access LIMS API: ' + err.message, cause: err});
    });
    
    
  
  });
};

/**
 * Login to LIMS API
 *
 * @returns {Promise}
 */
$lims.getAuthCredentials = () => {
  return new Promise((resolve, reject) => {
  
    gin.retrieve().then((credentials) => {
    
      logger.debug('Credentials retrieved');

      resolve(credentials);
    })
    .catch((err) => {
      logger.error('Failed to retrieve credentials');
      console.log(err);
    });
    
  });
};

module.exports = $lims;