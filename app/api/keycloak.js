const form = require('form-urlencoded').default;
const request = require('../request');
const nconf = require('../config');
const logger = require('../log');

const $keycloak = {};

const getKeycloakUri = () => {
  const keycloakConfig = nconf.get('keycloak') || {};
  return process.env.IPR_KEYCLOAK_URI
    || process.env.KEYCLOAK_URI
    || keycloakConfig.uri
    || nconf.get('keycloak:uri')
    || '';
};

const getKeycloakBaseUrl = () => {
  const keycloakUri = getKeycloakUri();

  if (!keycloakUri) {
    return null;
  }

  try {
    const parsedUri = new URL(keycloakUri);
    const realmTokenPath = /\/realms\/[^/]+\/protocol\/openid-connect\/token$/;
    const pathWithoutRealmToken = parsedUri.pathname.replace(realmTokenPath, '');
    return parsedUri.origin + pathWithoutRealmToken.replace(/\/$/, '');
  } catch (error) {
    return keycloakUri.replace(/\/$/, '');
  }
};

$keycloak.isDockerKeycloak = () => {
  return (process.env.IPR_DEPLOYMENT || '').toLowerCase() === 'docker';
};

$keycloak.getToken = async (username, password) => {
  const {clientId} = nconf.get('keycloak');
  const uri = getKeycloakUri();
  const options = {
    method: 'POST',
    url: uri,
    json: true,
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
  logger.debug(`Requesting token from ${uri}`);
  return request(options);
};

$keycloak.getAdminToken = async () => {
  const baseUrl = getKeycloakBaseUrl();
  const adminUsername = process.env.KEYCLOAK_ADMIN_USERNAME || process.env.KEYCLOAK_ADMIN_USER;
  const adminPassword = process.env.KEYCLOAK_ADMIN_PASSWORD || process.env.KEYCLOAK_ADMIN_PASS;

  if (!baseUrl || !adminUsername || !adminPassword) {
    throw new Error('Keycloak URL and admin credentials must be configured');
  }

  const tokenUrl = `${baseUrl.replace(/\/$/, '')}/realms/master/protocol/openid-connect/token`;

  const options = {
    method: 'POST',
    url: tokenUrl,
    json: true,
    throwOnHTTPError: true,
    body: form({
      client_id: 'admin-cli',
      username: adminUsername,
      password: adminPassword,
      grant_type: 'password',
    }),
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  };

  logger.debug(`Requesting Keycloak admin token from ${tokenUrl}`);
  return request(options);
};

$keycloak.createUser = async ({username, firstName, lastName, email}) => {
  const baseUrl = getKeycloakBaseUrl();
  const realm = process.env.KEYCLOAK_REALM || 'PORI';

  if (!baseUrl) {
    throw new Error('Keycloak base URL is not configured');
  }

  const adminToken = await $keycloak.getAdminToken();
  if (!adminToken || !adminToken.access_token) {
    throw new Error(`Unable to obtain Keycloak admin token: ${JSON.stringify(adminToken)}`);
  }

  const payload = {
    username,
    enabled: true,
    emailVerified: true,
    firstName,
    lastName,
    email,
    credentials: [{type: 'password', value: 'PORI-temporary-password', temporary: true}],
  };

  return request({
    method: 'POST',
    url: `${baseUrl.replace(/\/$/, '')}/admin/realms/${realm}/users`,
    json: true,
    throwOnHTTPError: true,
    body: JSON.stringify(payload),
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken.access_token}`,
    },
  });
};

$keycloak.deleteUser = async (username) => {
  const baseUrl = getKeycloakBaseUrl();
  const realm = process.env.KEYCLOAK_REALM || 'PORI';

  if (!baseUrl) {
    throw new Error('Keycloak base URL is not configured');
  }

  const adminToken = await $keycloak.getAdminToken();
  if (!adminToken || !adminToken.access_token) {
    throw new Error(`Unable to obtain Keycloak admin token: ${JSON.stringify(adminToken)}`);
  }

  const usersUrl = `${baseUrl.replace(/\/$/, '')}/admin/realms/${encodeURIComponent(realm)}/users`;
  const headers = {Authorization: `Bearer ${adminToken.access_token}`};
  const users = await request({
    method: 'GET',
    url: `${usersUrl}?username=${encodeURIComponent(username)}&exact=true`,
    json: true,
    throwOnHTTPError: true,
    headers,
  });

  if (!Array.isArray(users)) {
    throw new Error('Invalid Keycloak user lookup response');
  }

  // An already absent Keycloak user should not prevent deletion from IPR.
  if (users.length === 0) {
    return null;
  }
  if (users.length !== 1 || !users[0].id) {
    throw new Error('Unable to uniquely identify Keycloak user');
  }

  return request({
    method: 'DELETE',
    url: `${usersUrl}/${encodeURIComponent(users[0].id)}`,
    throwOnHTTPError: true,
    headers,
  });
};

module.exports = $keycloak;
