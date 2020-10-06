const request = require('request-promise-native');
const HTTP_STATUS = require('http-status-codes');
const jwt = require('jsonwebtoken');

const logger = require('../log');
const {getToken} = require('../api/keycloak');
const CONFIG = require('../config');

/**
 * GraphKB login middleware. Logs into GraphKB using the service user
 * or re-logs in if the token has timed out.
 */
const graphkbLoginMiddleware = async (req, res, next) => {
  const {graphkbToken: currentToken} = req;

  let validToken = false;
  if (currentToken) {
    // check if the current token is valid still
    try {
      const {exp} = jwt.decode(currentToken);
      if (Date.now() < exp * 1000) {
        validToken = true;
      }
    } catch (err) {
      logger.debug(err);
    }
  }

  if (!validToken) {
    try {
      // expired or not logged in, retry
      const {username, uri, password} = CONFIG.get('graphkb');
      const loginURI = `${uri}/token`;
      const token = await getToken(username, password);
      const options = {
        method: 'POST',
        uri: loginURI,
        json: true,
        body: {
          username,
          password,
          //keyCloakToken: token.access_token,
        },
      };
      const {kbToken} = await request(options);
      req.graphkbToken = kbToken;
    } catch (error) {
      logger.error(error);
      return res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json(`GraphKB login error: ${error}`);
    }
  }
  return next();
};

module.exports = graphkbLoginMiddleware;
