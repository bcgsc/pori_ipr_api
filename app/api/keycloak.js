const form = require('form-urlencoded').default;
const request = require('../request');
const nconf = require('../config');
const logger = require('../log');

const $keycloak = {};

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

$keycloak.createPORIUser = async (username, password, token, newUsername, newEmail) => {
  const {clientId, uri} = nconf.get('keycloak');
  const headers = headers: {
    'Content-Type': 'application/json',
    'Authorization': `bearer ${token}`
  },
  const newUserOptions = {
    method: 'POST',
    url: "https://keycloakdev01.bcgsc.ca/auth/admin/realms/GSC/users",
    json: true,
    headers: headers,
    data: {
      "username": newUsername,
      "email": newEmail,
      "enabled": true,
      "emailVerified": true
    }
  };
  const newUserSuccess = request(newUserOptions);

  const userslist = request(method: "GET",
  url: "https://keycloakdev01.bcgsc.ca/auth/admin/realms/GSC/users",
  headers=HEADERS);
  const newUser = (userslist).filter(item => item.username===newUsername)[0]
  console.dir(newUser)
  const roleslist = request(method: "GET",
  url: "https://keycloakdev01.bcgsc.ca/auth/admin/realms/GSC/roles", headers: headers);
  console.dir(roleslist);
  const iprRoleId = (roleslist).filter(item => item.name==='IPR')[0]['id']
  const graphkbRoleId = (roleslist).filter(item => item.name==='IPR')[0]['id']
  console.dir(iprRoleId);
  console.dir(graphkbRoleId);

  const roleMappingSuccess = request(
    method: "POST",
    url: `https://keycloakdev01.bcgsc.ca/auth/admin/realms/GSC/users/${user['id']}/role-mappings/realm`
    headers: headers,
    data: [{
      'id': gkbRoleId,
      'name': "GraphKB"
    }, {
      'id': iprRoleId,
      "name": "IPR"
    }],
    );
  console.dir(roleMappingSuccess);
  return roleMappingSuccess.status_code;

};

$keycloak.addUserCreateRoles = async (username, password, token, editUsername, editUseremail) => {
  const headers = headers: {
    'Content-Type': 'application/json',
    'Authorization': `bearer ${token}`
  },
  const userslist = request(method: "GET",
  url: "https://keycloakdev01.bcgsc.ca/auth/admin/realms/GSC/users",
  headers=HEADERS);
  const currUser = (userslist).filter(item => item.username===editUsername && item.email === editUseremail)[0]
  console.dir(currUser)
  const roleslist = request(method: "GET",
  url: "https://keycloakdev01.bcgsc.ca/auth/admin/realms/GSC/roles", headers: headers);
  console.dir(roleslist);
  const iprRoleId = (roleslist).filter(item => item.name==='IPR')[0]['id']
  const graphkbRoleId = (roleslist).filter(item => item.name==='IPR')[0]['id']
  console.dir(iprRoleId);
  console.dir(graphkbRoleId);

  const roleMappingSuccess = request(
    method: "POST",
    url: `https://keycloakdev01.bcgsc.ca/auth/admin/realms/GSC/users/${user['id']}/role-mappings/realm`
    headers: headers,
    data: [{
      'id': gkbRoleId,
      'name': "GraphKB"
    }, {
      'id': iprRoleId,
      "name": "IPR"
    }],
    );
  console.dir(roleMappingSuccess);
  return roleMappingSuccess.status_code;
};

$keycloak.removeUserCreateRoles = async (username, password, token, editUser) => {
  const {clientId, uri} = nconf.get('keycloak');
  const options = {
    method: 'DELETE',
    url: uri,
    json: true,

    headers: {
      'Content-Type': 'application/json',
      'Authorization': `bearer ${token}`
    },
  };
  logger.debug(`Requesting token from ${uri}`);
  return request(options);
};

module.exports = $keycloak;
