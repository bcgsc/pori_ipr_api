const request = require('request-promise-native');
const gin = require('../../lib/ginCredentials');

const host = 'https://lims13.bcgsc.ca';
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
  pogid.forEach((id) => {
    body.filters.content.push({
      op: '=',
      content: {
        field: 'participant_study_id',
        value: id,
      },
    });
  });

  // Make Request
  const credentials = await $lims.getAuthCredentials();
  const resp = await request({
    method: 'POST',
    uri: `${path}/sample`,
    gzip: true,
    body,
    json: true,
  }).auth(credentials.username, credentials.password);

  return resp;
};

/**
 * Get library data from LIMS
 *
 * @param {string|array} libraries - Libraries to get details for
 * @returns {Promise.<object>} - Returns the JSON parsed body of the resp
 */
$lims.library = async (libraries) => {
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
        field: 'name',
        value: libraries,
      },
    },
  };

  const credentials = await $lims.getAuthCredentials();
  const resp = await request({
    method: 'POST',
    uri: `${path}/library`,
    gzip: true,
    body: JSON.stringify(body),
  }).auth(credentials.username, credentials.password);

  return JSON.parse(resp);
};

$lims.illuminaRun = async (libraries) => {

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
            field: 'library',
            value: libraries,
          },
        },
        {
          op: 'in',
          content: {
            field: 'multiplex_library',
            value: libraries,
          },
        },
      ],
    },
  };

  const credentials = await $lims.getAuthCredentials();
  const resp = await request({
    method: 'POST',
    uri: `${path}/illumina_run`,
    gzip: true,
    body: JSON.stringify(body),
  }).auth(credentials.username, credentials.password);

  return JSON.parse(resp);
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
