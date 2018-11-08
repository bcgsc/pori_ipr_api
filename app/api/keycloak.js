const request = require('request-promise-native');
const form = require('form-urlencoded').default;

const $keycloak = {};

$keycloak.getToken = async (username, password) => {
  const options = {
    method: 'POST',
    uri: ['production', 'development', 'test'].includes(process.env.NODE_ENV)
      ? 'https://sso.bcgsc.ca/auth/realms/GSC/protocol/openid-connect/token'
      : 'http://ga4ghdev01.bcgsc.ca:8080/auth/realms/CanDIG/protocol/openid-connect/token',
    body: form({
      client_id: 'IPR',
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
