const form = require('form-urlencoded').default;
const request = require('../request');
const nconf = require('../config');
const logger = require('../log');

const $keycloak = {};

const getHeaders = (token) => {
  return {
    Accept: 'application/json',
    'Content-Encoding': 'deflate',
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token.access_token}`,
  };
};

const getRealmUri = (baseuri, realm) => {
  return `${baseuri}/auth/admin/realms/${realm}`;
};

$keycloak.getToken = async (username, password) => {
  const {clientId, uri} = nconf.get('keycloak');
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

$keycloak.getAdminCliToken = async (username, password) => {
  const {uri} = nconf.get('keycloak');
  const options = {
    method: 'POST',
    url: uri,
    json: true,
    body: form({
      client_id: 'admin-cli',
      grant_type: 'password',
      username,
      password,
    }),
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  };
  logger.debug(`Requesting admin-cli token from ${uri}`);
  return request(options);
};

$keycloak.createKeycloakUser = async (token, newUsername, newEmail) => {
  const {enableV16UserManagement, baseuri, realm} = nconf.get('keycloak');
  if (!enableV16UserManagement) {
    return {};
  }
  const headers = getHeaders(token);
  const realmUri = getRealmUri(baseuri, realm);

  // create the user
  await request({
    method: 'POST',
    url: `${realmUri}/users`,
    headers,
    body: JSON.stringify({
      username: newUsername,
      email: newEmail,
      emailVerified: true,
      enabled: true,
    }),
  });

  // get the id of the newly created user
  const userslist = await request({method: 'GET',
    json: true,
    url: `${realmUri}/users`,
    headers});
  const newUser = (userslist).filter((item) => {return item.username === newUsername;})[0];

  // get the ids of the ipr and graphkb roles
  const roleslist = await request({method: 'GET',
    json: true,
    url: `${realmUri}/roles`,
    headers});
  const iprRoleId = (roleslist).filter((item) => {return item.name === 'IPR';})[0].id;
  const graphkbRoleId = (roleslist).filter((item) => {return item.name === 'GraphKB';})[0].id;

  // add the roles
  const roleMappingResult = await request({
    method: 'POST',
    url: `${realmUri}/users/${newUser.id}/role-mappings/realm`,
    headers,
    body: JSON.stringify([
      {id: graphkbRoleId, name: 'GraphKB'},
      {id: iprRoleId, name: 'IPR'},
    ]),
  });
  return roleMappingResult.status_code;
};

$keycloak.deleteKeycloakUser = async (token, username) => {
  const {enableV16UserManagement, baseuri, realm} = nconf.get('keycloak');
  if (!enableV16UserManagement) {
    return {};
  }
  const headers = getHeaders(token);
  const realmUri = getRealmUri(baseuri, realm);
  const userslist = await request({method: 'GET',
    json: true,
    url: `${realmUri}/users`,
    headers});
  const currUser = (userslist).filter((item) => {return item.username === username;})[0];
  const deleteUserSuccess = await request({
    method: 'DELETE',
    json: true,
    headers,
    url: `${realmUri}/users/${currUser.id}`,
  });
  return deleteUserSuccess.status_code;
};

$keycloak.grantRealmAdmin = async (token, editUsername, editUseremail) => {
  const {enableV16UserManagement, baseuri, realm} = nconf.get('keycloak');
  if (!enableV16UserManagement) {
    return {};
  }
  const headers = getHeaders(token);
  const realmUri = getRealmUri(baseuri, realm);

  // get the id of the user to be updated
  const userslist = await request({method: 'GET',
    url: `${realmUri}/users`,
    json: true,
    headers});
  const currUser = (userslist).filter((item) => {return item.username === editUsername && item.email === editUseremail;})[0];

  // get the id of the realm-management client
  const clients = await request({method: 'GET',
    url: `${realmUri}/clients`,
    json: true,
    headers});
  const rmClient = (clients).filter((item) => {return item.clientId === 'realm-management';})[0];

  // get the id of the realm-admin role in the realm-management client
  const clientRoles = await request({method: 'GET',
    url: `${realmUri}/clients/${rmClient.id}/roles`,
    json: true,
    headers});
  const realmAdmin = (clientRoles).filter((item) => {return item.name === 'realm-admin';})[0];

  // add the realm-admin role in the realm-management client to the user
  const postclientroles = await request({method: 'POST',
    url: `${realmUri}/users/${currUser.id}/role-mappings/clients/${rmClient.id}`,
    headers,
    body: JSON.stringify([{
      id: realmAdmin.id,
      name: 'realm-admin',
    }])});
  return postclientroles;
};

$keycloak.ungrantRealmAdmin = async (token, editUsername, editUseremail) => {
  const {enableV16UserManagement, baseuri, realm} = nconf.get('keycloak');
  if (!enableV16UserManagement) {
    return {};
  }
  const headers = getHeaders(token);
  const realmUri = getRealmUri(baseuri, realm);

  // get the record for the current user
  const userslist = await request({method: 'GET',
    url: `${realmUri}/users`,
    headers});
  const currUser = (userslist).filter((item) => {return item.username === editUsername && item.email === editUseremail;})[0];

  // get the record for the realm-management client
  const clients = await request({method: 'GET',
    url: `${realmUri}/clients`,
    headers});
  const rmClient = (clients).filter((item) => {return item.clientId === 'realm-management';})[0];

  // get the record connecting the user to the role
  const clientRoleMappings = await request({
    method: 'GET',
    url: `${realmUri}/users/${currUser.id}/role-mappings/clients/${rmClient.id}`,
    headers,
  });
  // TODO - double check this, should be realm-admin not realm-management
  const clientRM = (clientRoleMappings).filter((item) => {return item.name === 'realm-management';})[0];

  // delete the role
  const deleteOutcome = await request({
    method: 'DELETE',
    url: `${realmUri}/users/${currUser.id}/role-mappings/clients/${rmClient.id}`,
    headers,
    body: JSON.stringify([{
      id: clientRM.id,
      name: 'realm-admin',
    }]),
  });
  return deleteOutcome;
};

module.exports = $keycloak;
