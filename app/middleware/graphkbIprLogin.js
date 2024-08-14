const HTTP_STATUS = require('http-status-codes');
const jwt = require('jsonwebtoken');

const request = require('../request');
const logger = require('../log');
const CONFIG = require('../config');

/**
 * GraphKB login middleware. Logs into GraphKB using the IPR user's keycloak token
 * or re-logs in if the token has timed out.
 */
const graphkbIprLoginMiddleware = async (req, res, next) => {
  const currentToken = req.graphkbToken;

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
      const {uri} = CONFIG.get('graphkb');
      const token = req.header('Authorization');
      const options = {
        method: 'POST',
        url: `${uri}/token`,
        json: true,
        body: JSON.stringify({
          keyCloakToken: token,
        }),
        headers: {
          'Content-Type': 'application/json',
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

module.exports = graphkbIprLoginMiddleware;
