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

$keycloak.createPORIUser = async (token, newUsername, newEmail) => {
  const {clientId, baseuri, enableUserCreate} = nconf.get('keycloak');
  if (!enableUserCreate) {
    return
  }
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `bearer ${token}`
  };
  const newUserOptions = {
    method: 'POST',
    url: `${baseuri}/auth/admin/realms/GSC/users`,
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

  const userslist = request({method: "GET",
  url: `${baseuri}/auth/admin/realms/GSC/users`,
  headers: headers});
  const newUser = (userslist).filter(item => item.username===newUsername)[0]
  console.dir(newUser)
  const roleslist = request({method: "GET",
  url: `${baseuri}/auth/admin/realms/GSC/roles`, headers: headers});
  console.dir(roleslist);
  const iprRoleId = (roleslist).filter(item => item.name==='IPR')[0]['id']
  const graphkbRoleId = (roleslist).filter(item => item.name==='IPR')[0]['id']
  console.dir(iprRoleId);
  console.dir(graphkbRoleId);

  const roleMappingSuccess = request({
    method: "POST",
    url: `${baseuri}/auth/admin/realms/GSC/users/${user['id']}/role-mappings/realm`,
    headers: headers,
    data: [{
      'id': gkbRoleId,
      'name': "GraphKB"
    }, {
      'id': iprRoleId,
      "name": "IPR"
    }],
});
  console.dir(roleMappingSuccess);
  return roleMappingSuccess.status_code;

};

// aka grantRealmAdmin
$keycloak.addUserCreateRoles = async (token, editUsername, editUseremail) => {
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `bearer ${token}`,
  };
  const userslist = request({method: 'GET',
    url: `${REALMS_URL}/${REALM}/users`,
    headers});
  const currUser = (userslist).filter((item) => {return item.username === editUsername && item.email === editUseremail;})[0];
  console.dir(currUser);
  const currUserId = currUser.id;

  const clients = request({method: 'GET',
    url: `${REALMS_URL}/${REALM}/clients`,
    headers});
  const rmClient = (clients).filter((item) => {return item.clientId === 'realm-management';})[0];
  const rmclientId = rmClient.id;

  const clientRoleMappings = request({
    method: 'GET',
    url: `${REALMS_URL}/${REALM}/users/${currUserId}/role-mappings/clients/${rmClientId}`,
    headers,
  });
  const clientRM = (clientRoleMappings).filter((item) => {return item.name === 'realm-management';})[0];
  const clientRMid = clientRM.id;
  console.dir(clientRM);

  resp2 = requests.request({
    method:      "GET",
  url: `${REALM_URL}/clients/${rm_client['id']}/roles`,
  headers}
  )
  const realm_admin = (resp2).filter((item) => {return item.name === 'realm-admin';})[0];

  const postclientroles = request({method: 'POST',
    url: `${REALMS_URL}/${REALM}/users/${currUserId}/role-mappings/clients/${rmclientId}`,
    headers,
    data: [{
      id: realm_admin['id'],
      name: 'realm-admin',
    }]});

  console.dir(postclientroles);
};


$keycloak.ungrantRealmAdmin = async (token, editUser) => {
  const {clientId, baseuri, enableUserCreate} = nconf.get('keycloak');
  if (!enableUserCreate) {
    return
  }

  const options = {
    method: 'DELETE',
    url: baseuri,
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
