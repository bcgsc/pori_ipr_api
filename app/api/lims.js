const request = require('request-promise-native');
const gin = require('../../lib/ginCredentials');

const host = 'https://lims16.bcgsc.ca';
const basePath = '/prod/limsapi';
const path = `${host}${basePath}`;
const $lims = {};


/**
 * Retrieve sample results based on POGID
 *
 *
 * @param {string|array} pogid - The patient identifier POGnnn
 * @returns {Promise.<string>} - Returns body of the resp in JSON
 */
$lims.sample = async (pogid) => {
  // Build base of query
  const body = {
    filters: {
      op: 'or',
      content: [],
    },
  };

  // Convert string pogid to array
  if (typeof pogid === 'string') {
    pogid = [pogid];
  }

  // Create array of POGIDs to search for
  body.filters.content = pogid.map((id) => {
    return {
      op: '=',
      content: {
        field: 'participantStudyId',
        value: id,
      },
    };
  });

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
 * @param {string|array} libraries - Libraries to get details for by library name
 * @param {string} [field=name] - Field to seach for libraries (i.e originalSourceName)
 * @returns {Promise.<object>} - Returns the JSON parsed body of the resp
 */
$lims.library = async (libraries, field = 'name') => {
  if (libraries.length === 0) {
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
    body: JSON.stringify(body),
    json: true,
  }).auth(credentials.username, credentials.password);
};

$lims.sequencerRun = async (libraries) => {

  if (libraries.length === 0) {
    throw new Error('Must be searching for 1 or more libraries.');
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
    body: JSON.stringify(body),
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
