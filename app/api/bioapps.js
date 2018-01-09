"use strict";

const https     = require('https');
const db        = require(process.cwd() + '/app/models');
const nconf     = require('nconf').argv().env().file({file: process.cwd() + '/config/config.json'});
const _         = require('lodash');
const request   = require('request-promise-native');
const gin       = require(process.cwd() + '/lib/ginCredentials');
const moment    = require('moment');

const host      = "http://bioappsdev01.bcgsc.ca:8104";
//const host      = "http://sbs.bcgsc.ca:8100";
const basePath  = "";
let logger      = process.logger;


let _TOKEN = null;

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
      
      // Check if it's expired
      if($bioapps.session.expires < moment.unix()) {
        // Reset Token
        $bioapps.session.token = $bioapps.session.promise = null;
      } else {
        // Session is good.
        logger.debug('Session already set');
        return resolve($bioapps.session);
      }
    }
    
    // Check if Session Promise is set
    if($bioapps.session.token === null && $bioapps.session.promise !== null) {
      
      logger.debug('Waiting for previous login request to finish.');
      
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
      
      logger.debug('No login session, calling login');
      
      $bioapps.session.promise = $bioapps.login();
      
      $bioapps.session.promise
        .then((session) => {
          logger.debug('Login resolved successfully');
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
        
          let token_b64 = new Buffer(data.token.split('.')[1], 'base64');
          let token_payload = JSON.parse(token_b64.toString('utf-8'));
          
          // Store token for session use.
          $bioapps.session.token = _TOKEN = data.token;
          $bioapps.session.expires = token_payload.exp;
          
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
    
    $bioapps.loginWrapper()
      .then((session) => {
        // Add session token
        opts.headers = {'X-Token': $bioapps.session.token};
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
 * Get detailed library object for n libraries
 * @param {string} libraries - Comma separated string of library IDs
 *
 * @returns {Promise} - Resolves with array of library(ies)
 */
$bioapps.libraryInfo = (libraries) => {
  return new Promise((resolve, reject) => {
    
    $bioapps.query({
        method: 'GET',
        uri: host + basePath + '/library/info?library=' + libraries,
        gzip: true,
        json: true
      })
      .then((response) => {
        resolve(response);
      })
      .catch((err) => {
        reject({message: 'Failed to retrieve library info details'});
        console.log('Failed to retireve assembly');
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
 *
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
        uri: host + basePath + '/patient_analysis?pog_id=' + pogid,
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

/**
 * Parse the Source object from BioApps to extract the relevant details
 *
 * @param {object} source - The source object returned by BioApps patient entries
 *
 * @return {object} - Returns a hashmap of the comparator values
 */
$bioapps.parseSourceSettings = (source) => {
  
  // Order the source analysis settings
  let source_analysis_settings = _.orderBy(source.source_analysis_settings, 'data_version');
  let current_settings = _.last(source_analysis_settings);
  
  let details = {
    disease_comparators: [],
    normal_biopsy: [],
    normal_primary: [],
    gtex_biopsy: [],
    gtex_primary: [],
    tumour_type_report: null,
    tumour_type_kb: null,
    threeLetterCode: null,
    disease_comparator_analysis: null,
    physicians: [],
  };
  
  if(current_settings.disease_comparators && current_settings.disease_comparators.length > 0) details.disease_comparators = _.orderBy(current_settings.disease_comparators, 'ordinal').map((c) => { return c.disease_code.code });
  if(current_settings.disease_comparator_for_analysis) details.disease_comparator_analysis =  current_settings.disease_comparator_for_analysis.code;
  
  if(current_settings.normal_comparator_biopsy_site) details.normal_biopsy.push(current_settings.normal_comparator_biopsy_site.name);
  if(current_settings.normal_comparator_primary_site) details.normal_primary.push(current_settings.normal_comparator_primary_site.name);
  if(current_settings.gtex_comparator_biopsy_site) details.gtex_biopsy.push(current_settings.gtex_comparator_biopsy_site.name);
  if(current_settings.gtex_comparator_primary_site) details.gtex_primary.push(current_settings.gtex_comparator_primary_site.name);
  
  if(current_settings.tumour_type_for_report) details.tumour_type_report = current_settings.tumour_type_for_report.name;
  if(current_settings.tumour_types_for_knowledgebase.length > 0) details.tumour_type_kb = current_settings.tumour_types_for_knowledgebase[0].name;
  
  if(current_settings.cancer_group) details.threeLetterCode = current_settings.cancer_group.code;
  
  if(current_settings.physicians) details.physicians.push(_.map(current_settings.physicians, (p) => { return {firstName: p.first_name, lastName: p.last_name}}));
  
  return details;
  
};

module.exports = $bioapps;