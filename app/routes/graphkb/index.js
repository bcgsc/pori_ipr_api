const request = require('request-promise-native');
const HTTP_STATUS = require('http-status-codes');
const express = require('express');
const jwt = require('jsonwebtoken');

const logger = require('../../log');
const {getToken} = require('../../api/keycloak');
const CONFIG = require('../../config');

const router = express.Router({mergeParams: true});
const AUTOCOMPLETE_LIMIT = 50;

/**
 * GraphKB login middleware. Logs into GraphKB using the service user
 * or re-logs in if the token has timed out.
 */
router.use(async (req, res, next) => {
  const {graphkbToken: currentToken} = req;

  let validToken = false;
  if (currentToken) {
    // check if the current token is valid still
    try {
      const {exp} = await jwt.decode(currentToken);
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
          keyCloakToken: token.access_token,
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
});


/**
 * Autocomplete endpoint for interfacing with GraphKB. This endpoint is used by the client
 * for the therapeutic options input forms
 */
router.get('/:targetType(variant|therapy|evidence|context)', async (req, res) => {
  const {query: {keyword}, params: {targetType}, graphkbToken} = req;
  const {uri} = CONFIG.get('graphkb');

  let query;
  const mapping = {
    evidence: 'EvidenceLevel',
    variant: 'Variant',
    therapy: 'Therapy',
  };

  if (targetType === 'context') {
    query = {
      target: 'Vocabulary',
      queryType: 'ancestors',
      filters: {name: 'therapeutic efficacy'},
    };
  } else {
    query = {target: mapping[targetType], limit: AUTOCOMPLETE_LIMIT};
    if (keyword) {
      query.keyword = keyword;
      query.queryType = 'keyword';
    }
  }
  try {
    const data = await request({
      uri: `${uri}/query`,
      method: 'POST',
      body: {
        ...query,
        neighbors: 1,
        limit: AUTOCOMPLETE_LIMIT,
        returnProperties: ['@class', '@rid', 'displayName'],
        orderBy: ['@class', 'displayName'],
      },
      json: true,
      headers: {
        Authorization: graphkbToken,
      },
    });
    return res.status(HTTP_STATUS.OK).json(data);
  } catch (error) {
    logger.error(error);
    return res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json(`GraphKB lookup error: ${error}`);
  }
});


module.exports = router;
