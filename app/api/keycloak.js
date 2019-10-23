const request = require('request-promise-native');
const form = require('form-urlencoded').default;
const nconf = require('../config');
const logger = require('../../lib/log');

const $keycloak = {};

$keycloak.getToken = async (username, password) => {
  const {clientId, uri} = nconf.get('keycloak');
  const options = {
    method: 'POST',
    uri,
    body: form({
      client_id: clientId,
      grant_type: 'password',
      username,
      password,
    }),
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  };
  logger.debug(`requesting token from ${uri}`);
  const resp = JSON.parse(await request(options));
  return resp;
};

module.exports = $keycloak;
