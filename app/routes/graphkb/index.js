const HTTP_STATUS = require('http-status-codes');
const express = require('express');

const logger = require('../../log');
const loginMiddleware = require('../../middleware/graphkb');
const {graphkbAutocomplete, graphkbEvidenceLevels} = require('../../api/graphkb');

const router = express.Router({mergeParams: true});


router.use(loginMiddleware);


/**
 * Autocomplete endpoint for interfacing with GraphKB. This endpoint is used by the client
 * for the therapeutic options input forms
 */
router.get('/:targetType(variant|therapy|evidenceLevel|context)', async (req, res) => {
  try {
    const data = await graphkbAutocomplete(req.params.targetType, req.graphkbToken, req.query?.search);
    return res.status(HTTP_STATUS.OK).json(data);
  } catch (error) {
    logger.error(error);
    return res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json(`GraphKB lookup error: ${error}`);
  }
});


/**
 * Endpoint for retrieving IPR evidence levels from GraphKB. This endpoint is used by the client
 * for the therapeutic options table
 */
router.get('/evidence-levels', async (req, res) => {
  const {graphkbToken} = req;
  try {
    const data = await graphkbEvidenceLevels(graphkbToken);
    return res.status(HTTP_STATUS.OK).json(data);
  } catch (error) {
    logger.error(error);
    return res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json(`GraphKB lookup error: ${error}`);
  }
});

module.exports = router;
