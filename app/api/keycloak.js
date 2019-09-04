const request = require('request-promise-native');
const form = require('form-urlencoded').default;
const nconf = require('../config');

const $keycloak = {};

$keycloak.getToken = async (username, password) => {
  const options = {
    method: 'POST',
    uri: nconf.get('keycloak:uri'),
    body: form({
      client_id: nconf.get('keycloak:clientId'),
      grant_type: 'password',
      username,
      password,
    }),
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  };
  const resp = JSON.parse(await request(options));
  return resp;
};

module.exports = $keycloak;
