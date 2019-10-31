const request = require('request-promise-native');
const moment = require('moment');
const _ = require('lodash');
const nconf = require('../config');
const gin = require('../../lib/ginCredentials');

const logger = require('../log');

const HOSTNAME = nconf.get('bioapps:hostname');
const BASEPATH = nconf.get('bioapps:api');
const PATH = `${HOSTNAME}${BASEPATH}`;

const $bioapps = {};

$bioapps.session = {
  token: null,
  expires: null,
  promise: null,
};

/**
 * BioApps Login Wrapper for token retrieval
 *
 * @returns {Promise.<object>} - returns bioapps session promise
 */
$bioapps.loginWrapper = async () => {
  if ($bioapps.session.token !== null) {
    // Check if it's expired
    if ($bioapps.session.expires < moment.unix()) {
      // Reset Token
      $bioapps.session.token = $bioapps.session.promise = null;
    } else {
      // Session is good.
      logger.debug('Session already set');
      return $bioapps.session;
    }
  } else if ($bioapps.session.promise !== null) {
    logger.debug('Waiting for previous login request to finish.');
  } else {
    logger.debug('No login session, calling login');
    $bioapps.session.promise = await $bioapps.login();
    logger.debug('Login resolved successfully');
  }
  return $bioapps.session.promise;
};

/**
 * Login to BioApps API
 *
 * @returns {Promise.<object>} - Returns current bioapps session
 */
$bioapps.login = async () => {

  const credentials = await gin.retrieve();
  logger.debug('Credentials retrieved, attempting to auth with BioApps');

  const resp = await request({
    method: 'POST',
    uri: `${PATH}/session`,
    body: {username: credentials.username, password: credentials.password},
    json: true,
  });

  const tokenB64 = Buffer.from(resp.token.split('.')[1], 'base64');
  const tokenPayload = JSON.parse(tokenB64.toString('utf-8'));

  // Store token for session use.
  $bioapps.session.token = resp.token;
  $bioapps.session.expires = tokenPayload.exp;

  logger.info('Logged into BioApps');
  return $bioapps.session;
};

/**
 * BioApps API Query Wrapper
 *
 * Pipes all BioApps API requests through a common function. Allows promise delay for authenticated session login
 * before queries are sent.
 *
 * @param {object} opts - The arguments for a HTTP Request
 * @returns {Promise.<object|string>} - Resolves with HTTP Response object
 */
$bioapps.query = async (opts) => {
  await $bioapps.loginWrapper();
  opts.headers = {'X-Token': $bioapps.session.token};
  return request(opts);
};

/**
 * Retrieve merged bam results
 *
 * @param {string} library - The library name to filter by
 * @returns {Promise.<object>} - Resolves with merged bam results
 */
$bioapps.merge = async (library) => {
  return $bioapps.query({
    method: 'GET',
    uri: `${PATH}/merge?production=true&library=${library}`,
    gzip: true,
    json: true,
  });
};

/**
 * Retrieve assembly results
 *
 * @param {string} library - The library name to filter by
 * @returns {Promise.<object>} - Resolves with assembly results
 */
$bioapps.assembly = async (library) => {
  return $bioapps.query({
    method: 'GET',
    uri: `${PATH}/assembly?production=true&library=${library}`,
    gzip: true,
    json: true,
  });
};

/**
 * Get detailed library object for n libraries
 * @param {string} libraries - Comma separated string of library IDs
 *
 * @returns {Promise.<Array<string>>} - Resolves with array of library(ies)
 */
$bioapps.libraryInfo = async (libraries) => {
  return $bioapps.query({
    method: 'GET',
    uri: `${PATH}/library/info?library=${libraries}`,
    gzip: true,
    json: true,
  });
};


/**
 * Retrieve Target Lanes for a library
 *
 * @param {string} libraries - Names of libraries to get
 * @returns {Promise} - Resolves with key-value object of library names to lanes
 */
$bioapps.targetLanes = async (libraries) => {
  if (Array.isArray(libraries)) {
    libraries = libraries.join(',');
  }

  return $bioapps.query({
    method: 'GET',
    uri: `${PATH}/library/lane_target?production=true&library=${libraries}`,
    gzip: true,
    json: true,
  });
};


/**
 * Retrieve lib aligned cores
 *
 * @param {string} libraries - Libraries; Comma separated if more than 1
 *
 * @returns {Promise.<Array.<string>>} - Resolves with array of libcores aligned
 */
$bioapps.libraryAlignedCores = async (libraries) => {
  if (Array.isArray(libraries)) {
    libraries = libraries.join(',');
  }

  return $bioapps.query({
    method: 'GET',
    uri: `${PATH}/aligned_libcore/info?production=true&library=${libraries}`,
    gzip: true,
    json: true,
  });
};

/**
 * Retrieve Patient Data
 *
 * @param {string} pogid - The patient POGID
 * @returns {Promise.<object>} - Resolves with assembly results
 */
$bioapps.patient = async (pogid) => {
  return $bioapps.query({
    method: 'GET',
    uri: `${PATH}/patient_analysis?pog_id=${pogid}`,
    gzip: true,
    json: true,
  });
};


/**
 * Update BioApps patient record
 *
 * @param {stirng} patient - Patient ID / POGID
 * @param {object} analysis - Analysis object with data attributes to be updated
 * @returns {Promise.<object>} - Returns an HTTP response object
 */
$bioapps.updatePatientAnalysis = async (patient, analysis) => {

  const body = {
    biopsy_notes: analysis.biopsy_notes,
    biopsy_date: analysis.biopsy_date,
    cancer_group: analysis.threeLetterCode,
    diagnosis: analysis.disease,
    disease_comparator_for_analysis: analysis.comparator_disease.analysis,
    disease_comparators: _.map(analysis.comparator_disease.all, (c, i) => {
      return {ordinal: i, disease_code: c};
    }),
    gtex_comparator_primary_site: (analysis.comparator_normal.gtex_primary) ? analysis.comparator_normal.gtex_primary[0] : null,
    gtex_comparator_biopsy_site: (analysis.comparator_normal.gtex_biopsy) ? analysis.comparator_normal.gtex_biopsy[0] : null,
    normal_comparator_primary_site: (analysis.comparator_normal.normal_primary) ? analysis.comparator_normal.normal_primary[0] : null,
    normal_comparator_biopsy_site: (analysis.comparator_normal.normal_biopsy) ? analysis.comparator_normal.normal_biopsy[0] : null,
    physicians: analysis.physician,
    tumour_type_for_report: analysis.comparator_disease.tumour_type_report,
    tumour_type_for_knowledgebase: [{name: analysis.comparator_disease.tumour_type_kb}],
  };

  return $bioapps.query({
    method: 'PATCH',
    uri: `${PATH}/patient_analysis/${patient}`,
    json: body,
  });
};

/**
 * Parse the Source object from BioApps to extract the relevant details
 *
 * @param {object} source - The source object returned by BioApps patient entries
 *
 * @return {object} - Returns a hashmap of the comparator values
 */
$bioapps.parseSourceSettings = async (source) => {

  // Order the source analysis settings
  const sourceAnalysisSettings = _.orderBy(source.source_analysis_settings, 'data_version');
  const currentSettings = sourceAnalysisSettings[sourceAnalysisSettings.length - 1];

  const details = {
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
    biop: null,
  };

  if (currentSettings.disease_comparators && currentSettings.disease_comparators.length > 0) {
    details.disease_comparators = _.orderBy(currentSettings.disease_comparators, 'ordinal').map((c) => {
      return c.disease_code.code;
    });
  }
  if (currentSettings.disease_comparator_for_analysis) {
    details.disease_comparator_analysis = currentSettings.disease_comparator_for_analysis.code;
  }
  if (currentSettings.normal_comparator_biopsy_site) {
    details.normal_biopsy.push(currentSettings.normal_comparator_biopsy_site.name);
  }
  if (currentSettings.normal_comparator_primary_site) {
    details.normal_primary.push(currentSettings.normal_comparator_primary_site.name);
  }
  if (currentSettings.gtex_comparator_biopsy_site) {
    details.gtex_biopsy.push(currentSettings.gtex_comparator_biopsy_site.name);
  }
  if (currentSettings.gtex_comparator_primary_site) {
    details.gtex_primary.push(currentSettings.gtex_comparator_primary_site.name);
  }
  if (currentSettings.tumour_type_for_report) {
    details.tumour_type_report = currentSettings.tumour_type_for_report.name;
  }
  if (currentSettings.tumour_types_for_knowledgebase && currentSettings.tumour_types_for_knowledgebase.length > 0) {
    details.tumour_type_kb = currentSettings.tumour_types_for_knowledgebase[0].name;
  }
  if (currentSettings.cancer_group) {
    details.threeLetterCode = currentSettings.cancer_group.code;
  }
  if (currentSettings.physicians) {
    details.physicians.push(currentSettings.physicians.map((physician) => {
      return {firstName: physician.first_name, lastName: physician.last_name};
    }));
  }
  if (currentSettings.biopsy_number) {
    details.biop = currentSettings.sample_type + currentSettings.biopsy_number;
  }
  return details;
};

module.exports = $bioapps;
