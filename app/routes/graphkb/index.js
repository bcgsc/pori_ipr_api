const {StatusCodes} = require('http-status-codes');
const express = require('express');

const logger = require('../../log');
const loginMiddleware = require('../../middleware/graphkb');
const {
  graphkbAutocomplete,
  graphkbEvidenceLevels,
  graphkbStatement,
  graphkbAddUser,
  graphkbGetReadonlyGroupId,
} = require('../../api/graphkb');

const router = express.Router({mergeParams: true});

router.use(loginMiddleware);

/**
 * Autocomplete endpoint for interfacing with GraphKB. This endpoint is used by the client
 * for the therapeutic options input forms
 */
router.get('/:targetType(variant|signature|therapy|evidenceLevel|context)', async (req, res) => {
  try {
    const data = await graphkbAutocomplete(
      req.params.targetType,
      req.graphkbToken,
      req.query?.search,
    );
    return res.status(StatusCodes.OK).json(data);
  } catch (error) {
    logger.error(error);
    return res.status(StatusCodes.SERVICE_UNAVAILABLE).json(`GraphKB lookup error: ${error}`);
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
    return res.status(StatusCodes.OK).json(data);
  } catch (error) {
    logger.error(error);
    return res.status(StatusCodes.SERVICE_UNAVAILABLE).json(`GraphKB lookup error: ${error}`);
  }
});

/**
 * Endpoint for retrieving Statement related info from GraphKB. This endpoint is used by the client
 * for getting @rids from graphKB to be used to add kbmatches to potential therapeutic targets
 */
router.get('/statements/:statementId', async (req, res) => {
  const {graphkbToken} = req;
  try {
    const data = await graphkbStatement(graphkbToken, req.params.statementId);
    return res.status(StatusCodes.OK).json(data);
  } catch (error) {
    logger.error(error);
    return res.status(StatusCodes.SERVICE_UNAVAILABLE).json(`GraphKB lookup error: ${error}`);
  }
});

router.post('/new-user', async (req, res) => {
  try {
    const {graphkbToken, body: {email, username}} = req;
    const groupId = await graphkbGetReadonlyGroupId(graphkbToken);
    const gkbCreateResp = await graphkbAddUser(graphkbToken, username, email, groupId);
    if (/error/i.test(gkbCreateResp.name)) {
      throw new Error(gkbCreateResp.message);
    }
    return res.status(StatusCodes.CREATED).json();
  } catch (error) {
    logger.error(`Error trying to create user on GraphKB, ${error}`);
    return res.status(StatusCodes.SERVICE_UNAVAILABLE).json({
      error: {message: `GraphKB user creation error: ${error}`},
    });
  }
});

module.exports = router;
