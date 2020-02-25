const request = require('request-promise-native');
const HTTP_STATUS = require('http-status-codes');
const express = require('express');

const logger = require('../../log');
const CONFIG = require('../../config');
const loginMiddleware = require('../../middleware/graphkb');

const router = express.Router({mergeParams: true});
const AUTOCOMPLETE_LIMIT = 50;


router.use(loginMiddleware);


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
