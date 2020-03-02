const HTTP_STATUS = require('http-status-codes');
const express = require('express');

const logger = require('../../log');
const loginMiddleware = require('../../middleware/graphkb');
const {graphkbAutocomplete} = require('../../api/graphkb');

const router = express.Router({mergeParams: true});


router.use(loginMiddleware);


/**
 * Autocomplete endpoint for interfacing with GraphKB. This endpoint is used by the client
 * for the therapeutic options input forms
 */
router.get('/:targetType(variant|therapy|evidence|context)', async (req, res) => {
  const {query: {keyword}, params: {targetType}, graphkbToken} = req;
  try {
    const data = await graphkbAutocomplete(targetType, graphkbToken, keyword);
    return res.status(HTTP_STATUS.OK).json(data);
  } catch (error) {
    logger.error(error);
    return res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json(`GraphKB lookup error: ${error}`);
  }
});


module.exports = router;
