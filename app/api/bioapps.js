"use strict";

const https     = require('https');
const db        = require(process.cwd() + '/app/models');
const nconf     = require('nconf').argv().env().file({file: process.cwd() + '/config/config.json'});
const _         = require('lodash');
const request   = require('request-promise-native');
const gin       = require(process.cwd() + '/lib/ginCredentials');

//const host      = "http://bioappsdev01.bcgsc.ca:8100";
const host      = "http://sbs.bcgsc.ca:8100";
const basePath  = "";
let logger      = process.logger;


let $bioapps = {};

$bioapps.session = {
  token: null,
  expires: null,
  promise: null
};

/**
 * BioApps Login Wrapper for token retrieval
 *
 * @returns {Promise}
 */
$bioapps.loginWrapper = () => {
  return new Promise((resolve, reject) => {
    
    
    if($bioapps.session.token !== null) {
      logger.debug('Session already set');
      return resolve($bioapps.session);
    }
    
    console.log('Current Login Status', $bioapps.session);
    
    // Check if Session Promise is set
    if($bioapps.session.token === null && $bioapps.session.promise !== null) {
      
      console.log('### PROMISE IN PROCESS. WAITING FOR IT');
      
      $bioapps.session.promise
        .then((session) => {
          resolve(session);
        })
        .catch((err) => {
          reject({message: 'Unable to login to BioApps', cause: err});
          logger.error('Failed to login to BioApps', err.message);
          console.log(err);
        });
      
    }
    
    if($bioapps.session.token === null && $bioapps.session.promise === null) {
      $bioapps.session.promise = $bioapps.login();
  
      $bioapps.session.promise
        .then((session) => {
          console.log('#### LOGGED INTO BIOAPPS #####');
          resolve(session);
        })
        .catch((err) => {
          reject({message: 'Unable to login to BioApps', cause: err});
          logger.error('Failed to login to BioApps', err.message);
          console.log(err);
        });
      
    }
    
  });
};

/**
 * Login to BioApps API
 *
 * @returns {Promise}
 */
$bioapps.login = () => {
  return new Promise((resolve, reject) => {
  
    gin.retrieve().then((credentials) => {
    
      logger.debug('Credentials retrieved, attempting to auth with BioApps');
    
      request({
          method: 'POST',
          uri: host + basePath + '/session',
          body: {username: credentials.username, password: credentials.password},
          json: true
        })
        .then((data) => {
          
          logger.debug('Response from BioApps /session endpoint received');
          
          // Store token for session use.
          $bioapps.session.token = data.token;
          
          logger.info('Logged into BioApps');
          resolve($bioapps.session);
        })
        .catch((err) => {
          reject({message: 'unable to authenticate with BioApps API'});
          console.log(err);
          process.exit();
        });
    })
    .catch((err) => {
      logger.error('Failed to retrieve creds');
      console.log(err);
    });
    
  });
};

/**
 * BioApps API Query Wrapper
 *
 * Pipes all BioApps API requests through a common function. Allows promise delay for authenticated session login
 * before queries are sent.
 *
 * @param {object} opts - The arguments for a HTTP Request
 * @returns {Promise/object} - Resolves with HTTP Response object
 */
$bioapps.query = (opts) => {
  return new Promise((resolve, reject) => {
  
    // Add session token
    opts.headers = {'X-Token': $bioapps.session.token};
    
    $bioapps.loginWrapper()
      .then(() => {
        return request(opts);
      })
      .then((result) => {
        resolve(result);
      })
      .catch((err) => {
        reject(err);
      });
    
  });
};

/**
 * Retrieve merged bam results
 *
 * @param {string} library - The library name to filter by
 * @returns {Promise} - Resolves with merged bam results
 */
$bioapps.merge = (library) => {
  return new Promise((resolve, reject) => {
    
    $bioapps.query({
        method: 'GET',
        uri: host + basePath + '/merge?production=true&library=' + library,
        gzip: true,
        json: true
      })
      .then((response) => {
        resolve(response);
      })
      .catch((err) => {
        reject({message: 'Failed to retrieve merged bams'});
        console.log('Failed to retrieve merged bams', err);
      });
    
  });
};

/**
 * Retrieve assembly results
 *
 * @param {string} library - The library name to filter by
 * @returns {Promise} - Resolves with assembly results
 */
$bioapps.assembly = (library) => {
  return new Promise((resolve, reject) => {
    
    $bioapps.query({
        method: 'GET',
        uri: host + basePath + '/assembly?production=true&library=' + library,
        gzip: true,
        json: true
      })
      .then((response) => {
        resolve(response);
      })
      .catch((err) => {
        reject({message: 'Failed to retrieve assembly'});
        console.log('Failed to retrieve assembly', err);
      });
    
  });
};

/**
 * Retrieve Target Lanes for a library
 *
 * @param {string} libraries
 * @returns {Promise} - Resolves with key-value object of library names to lanes
 */
$bioapps.targetLanes = (libraries) => {
  return new Promise((resolve, reject) => {
    
    if(Array.isArray(libraries)) libraries = _.join(libraries, ',');
    
    $bioapps.query({
        method: 'GET',
        uri: host + basePath + '/library/lane_target?production=true&library=' + libraries,
        gzip: true,
        json: true
      })
      .then((response) => {
        resolve(response);
      })
      .catch((err) => {
        reject({message: 'Failed to retrieve target lanes'});
        console.log('Failed to retrieve target lanes: ', err);
      });
    
  });
};


/**
 * Retrieve lib aligned cores
 *
 * @param {string} libraries - Libraries; Comma separated if more than 1
 * @returns {Promise} - Resolves with array of libcores aligned
 */
$bioapps.libraryAlignedCores = (libraries) => {
  return new Promise((resolve, reject) => {
  
    if (Array.isArray(libraries)) libraries = _.join(libraries, ',');
    
    $bioapps.query({
      method: 'GET',
      uri: host + basePath + '/aligned_libcore/info?production=true&library=' + libraries,
      gzip: true,
      json: true
    })
      .then((result) => {
        resolve(result);
      })
      .catch((err) => {
        reject(err);
        console.log('Failed to retrieve lib aligned cores', err);
      });
  });
};

/**
 * Retrieve Patient Data
 *
 * @param {string} pogid - The patient POGID
 * @returns {Promise} - Resolves with assembly results
 */
$bioapps.patient = (pogid) => {
  return new Promise((resolve, reject) => {
    
    $bioapps.query({
        method: 'GET',
        uri: host + basePath + '/patient_analysis/patient/' + pogid,
        gzip: true,
        json: true
      })
      .then((response) => {
        resolve(response);
      })
      .catch((err) => {
        if(err.statusCode > 499 || err.statusCode < 200) {
          reject({message: 'A server error in BioApps prevented the request from being processed. ' + err.message});
          console.log(err);
        }
        resolve([]);
        //reject({message: 'Failed to query BioApps for patient information: ' + err.message});
        //console.log('Failed to query BioApps for patient information', err);
      });
    
  });
};

module.exports = $bioapps;