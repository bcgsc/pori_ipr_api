const HTTP_STATUS = require('http-status-codes');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const db = require('../models');
const keycloak = require('../api/keycloak');
const nconf = require('../config');
const cache = require('../cache');

const logger = require('../log');

const pubKey = fs.readFileSync(nconf.get('keycloak:keyfile')).toString();

const getAdminCliToken = async (req, res) => {
    const {enableV16UserManagement} = nconf.get('keycloak');
    if (!enableV16UserManagement) {
        return;
    }
  let token = req.header('Authorization') || '';

  // Check for basic authorization header
  if (token.includes('Basic')) {
    let credentials;
    try {
      credentials = Buffer.from(token.split(' ')[1], 'base64').toString('utf-8').split(':');
    } catch (err) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({message: 'The authentication header you provided was not properly formatted.'});
    }
    try {
      const adminCliToken = await keycloak.getAdminCliToken(credentials[0], credentials[1]);
      const adminToken = adminCliToken.access_token;
    } catch (error) {
      let errorDescription;
      try {
        errorDescription = JSON.parse(error.error).error_description;
      } catch (parseError) {
        // if the error is propagated from upstread of the keycloak server it will not have the error.error_description format (ex. certificate failure)
        errorDescription = error;
      }
      console.dir(credentials);
      logger.error(`Authentication failed ${error.name} ${error.statusCode} - ${errorDescription}`);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message: `Authentication failed ${error.name} ${error.statusCode} - ${errorDescription}`}});
    }
  }
  if (!token) {
    return res.status(HTTP_STATUS.FORBIDDEN).json({message: 'Missing required Authorization token'});
  }

  return adminToken;
};

module.exports = {
  getAdminCliToken,
};
