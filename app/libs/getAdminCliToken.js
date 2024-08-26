const HTTP_STATUS = require('http-status-codes');
const keycloak = require('../api/keycloak');
const nconf = require('../config');

const logger = require('../log');

const getAdminCliToken = async (req, res) => {
  const {enableV16UserManagement} = nconf.get('keycloak');
  if (!enableV16UserManagement) {
    return null;
  }
  const token = req.header('Authorization') || '';
  let adminToken;
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
      adminToken = adminCliToken.access_token;
    } catch (error) {
      let errorDescription;
      try {
        errorDescription = JSON.parse(error.error).error_description;
      } catch (parseError) {
        // if the error is propagated from upstread of the keycloak server it will not have the error.error_description format (ex. certificate failure)
        errorDescription = error;
      }
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
