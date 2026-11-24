const form = require('form-urlencoded').default;
const request = require('../request');
const nconf = require('../config');
const logger = require('../log');
const generator = require('generate-password');

const $keycloak = {};
const KEYCLOAK_REQUEST_TIMEOUT_MS = 10000;

const getKeycloakUri = () => {
  const keycloakConfig = nconf.get('keycloak') || {};
  return process.env.IPR_KEYCLOAK_URI
    || process.env.KEYCLOAK_URI
    || keycloakConfig.uri
    || nconf.get('keycloak:uri')
    || '';
};

const getKeycloakRealm = () => {
  const baseUrl = getKeycloakUri();
  const match = baseUrl.match(/\/auth\/realms\/([^/]+)/);

  if (!match) {
    throw new Error('Keycloak URL must contain /auth/realms/<realm>/');
  }

  return match[1];
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
  const adminUsername = process.env.KEYCLOAK_ADMIN_USER;
  const adminPassword = process.env.KEYCLOAK_ADMIN_PASS;

  if (!baseUrl || !adminUsername || !adminPassword) {
    throw new Error('Keycloak URL and admin credentials must be configured');
  }

  const tokenUrl = `${baseUrl.replace(/\/$/, '')}/realms/master/protocol/openid-connect/token`;

  const options = {
    method: 'POST',
    url: tokenUrl,
    timeout: KEYCLOAK_REQUEST_TIMEOUT_MS,
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
  const realm = getKeycloakRealm();

  if (!baseUrl) {
    throw new Error('Keycloak base URL is not configured');
  }

  const adminToken = await $keycloak.getAdminToken();
  if (!adminToken || !adminToken.access_token) {
    throw new Error(`Unable to obtain Keycloak admin token: ${JSON.stringify(adminToken)}`);
  }

  const tempPassword = generator.generate({
    length: 12,
    numbers: true,
    symbols: true,
    uppercase: true,
    lowercase: true,
    strict: true,
  });

  const payload = {
    username,
    enabled: true,
    emailVerified: true,
    firstName,
    lastName,
    email,
    credentials: [{type: 'password', value: tempPassword, temporary: true}],
  };

  return request({
    method: 'POST',
    url: `${baseUrl.replace(/\/$/, '')}/admin/realms/${realm}/users`,
    timeout: KEYCLOAK_REQUEST_TIMEOUT_MS,
    json: true,
    throwOnHTTPError: true,
    body: JSON.stringify(payload),
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken.access_token}`,
    },
  });
};

$keycloak.updateUser = async ({username, firstName, lastName, email}) => {
  const baseUrl = getKeycloakBaseUrl();
  const realm = getKeycloakRealm();

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
  if (users.length === 0) {
    throw new Error(`Keycloak user not found: ${username}`);
  }
  if (users.length !== 1 || !users[0].id) {
    throw new Error('Unable to uniquely identify Keycloak user');
  }

  const payload = {
    ...(email !== undefined && email !== users[0].email ? {emailVerified: false} : {}),
    firstName,
    lastName,
    email,
  };

  return request({
    method: 'PUT',
    url: `${baseUrl.replace(/\/$/, '')}/admin/realms/${realm}/users/${encodeURIComponent(users[0].id)}`,
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
  const realm = getKeycloakRealm();

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
