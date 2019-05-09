const request = require('request-promise-native');
const nconf = require('nconf').argv().env().file({file: `${__dirname}/../../config/config.json`});
const gin = require('../../lib/ginCredentials');

const hostname = nconf.get('lims:hostname');
const basePath = nconf.get('lims:api');
const path = `${hostname}${basePath}`;

const $lims = {};

/**
 * Retrieve biological metadata based on POGID
 *
 * @param {string|Array.<string>} patientIds - Patient identifier POGnnn
 * @param {string} [field=name] - Field to seach for patient IDs (i.e originalSourceName)
 * @returns {Promise.<string>} - Returns LIMS metadata for pogid(s)
 */
$lims.biologicalMetadata = async (patientIds, field = 'participantStudyID') => {
  if (!patientIds || patientIds.length === 0) {
    throw new Error('Must provide 1 or more patient ids');
  }

  // Convert string pogid to array
  if (typeof patientIds === 'string') {
    patientIds = [patientIds];
  }

  // Query body
  const body = {
    filters: {
      op: 'in',
      content: {
        field,
        value: patientIds,
      },
    },
  };

  // Make Request
  const credentials = await $lims.getAuthCredentials();
  return request({
    method: 'POST',
    uri: `${path}/biological-metadata/search`,
    gzip: true,
    body,
    json: true,
  }).auth(credentials.username, credentials.password);
};

/**
 * Get library data from LIMS
 *
 * @param {string|Array.<string>} libraries - Libraries to get details for by library field
 * @param {string} [field=name] - Field to seach for libraries (i.e originalSourceName)
 * @returns {Promise.<object>} - Returns library data from LIMS
 */
$lims.library = async (libraries, field = 'name') => {
  if (!libraries || libraries.length === 0) {
    throw new Error('Must be searching for 1 or more libraries');
  }

  if (typeof libraries === 'string') {
    libraries = [libraries];
  }

  const body = {
    filters: {
      op: 'in',
      content: {
        field,
        value: libraries,
      },
    },
  };

  const credentials = await $lims.getAuthCredentials();
  return request({
    method: 'POST',
    uri: `${path}/libraries/search`,
    gzip: true,
    body,
    json: true,
  }).auth(credentials.username, credentials.password);
};

/**
 * Get sequencer-run data from LIMS
 *
 * @param {string|Array.<string>} libraries - List libraries or multiplex libraries
 * @returns {Promise.<object>} - Returns sequencer-data from LIMS
 */
$lims.sequencerRun = async (libraries) => {
  if (!libraries || libraries.length === 0) {
    throw new Error('Must be searching for 1 or more libraries.');
  }

  if (typeof libraries === 'string') {
    libraries = [libraries];
  }

  const body = {
    filters: {
      op: 'or',
      content: [
        {
          op: 'in',
          content: {
            field: 'libraryName',
            value: libraries,
          },
        },
        {
          op: 'in',
          content: {
            field: 'multiplexLibraryName',
            value: libraries,
          },
        },
      ],
    },
  };

  const credentials = await $lims.getAuthCredentials();
  return request({
    method: 'POST',
    uri: `${path}/sequencer-runs/search`,
    gzip: true,
    body,
    json: true,
  }).auth(credentials.username, credentials.password);
};

/**
 * Get disease ontology data from LIMS
 *
 * @param {string} query - String to query disease ontology in LIMS for
 * @returns {Promise.<object>} - Returns disease ontology data from LIMS
 */
$lims.diseaseOntology = async (query) => {
  if (!query) {
    throw new Error('Must provide a query');
  }

  const credentials = await $lims.getAuthCredentials();
  return request({
    method: 'GET',
    uri: `${path}/elastic/disease_ontology/${query}`,
    gzip: true,
    json: true,
  }).auth(credentials.username, credentials.password);
};

/**
 * Login to LIMS API
 *
 * @returns {Promise.<Object.<string, string>>} - Returns an object
 * that contains a username and password
 */
$lims.getAuthCredentials = async () => {
  return gin.retrieve();
};

module.exports = $lims;
