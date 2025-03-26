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
const request = require('../../request');
const CONFIG = require('../../config');

const router = express.Router({mergeParams: true});

// Check GraphKB ErrorMixin for updates
const errorMap = {
  AuthenticationError: {
    status: StatusCodes.UNAUTHORIZED,
    message: 'Authentication failed. Please check your credentials.',
  },
  ControlledVocabularyError: {
    status: StatusCodes.BAD_REQUEST,
    message: 'The input does not match the controlled vocabulary.',
  },
  DatabaseConnectionError: {
    status: StatusCodes.INTERNAL_SERVER_ERROR,
    message: 'Unable to connect to the database.',
  },
  DatabaseRequestError: {
    status: StatusCodes.BAD_REQUEST,
    message: 'Invalid database request.',
  },
  MultipleRecordsFoundError: {
    status: StatusCodes.CONFLICT,
    message: 'Multiple records found when only one was expected.',
  },
  NoRecordFoundError: {
    status: StatusCodes.NOT_FOUND,
    message: 'No record found matching the query.',
  },
  NotImplementedError: {
    status: StatusCodes.NOT_IMPLEMENTED,
    message: 'The requested feature is not implemented.',
  },
  ParsingError: {
    status: StatusCodes.BAD_REQUEST,
    message: 'There was an error parsing the request data.',
  },
  PermissionError: {
    status: StatusCodes.FORBIDDEN,
    message: 'You do not have permission to perform this action.',
  },
  RecordConflictError: {
    status: StatusCodes.CONFLICT,
    message: 'The record already exists or there is a conflict with existing data.',
  },
  ValidationError: {
    status: StatusCodes.BAD_REQUEST,
    message: 'There was a validation error in the input data.',
  },
};

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

/**
 * Middleware to take care of using the requester's token to login to graphKb to make a new user
 * Needs to use this to override due to middleware used by graphKb is global user instead
 */
const useRequesterTokenAsGraphKbLoginMiddleware = async (req, res, next) => {
  // Takes incoming request user token instead of current session
  const token = req.header('Authorization');
  try {
    const {uri} = CONFIG.get('graphkb');
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
    return res.status(StatusCodes.SERVICE_UNAVAILABLE)
      .json(`GraphKB login error: ${error}`);
  }
  return next();
};

router.post('/new-user', useRequesterTokenAsGraphKbLoginMiddleware, async (req, res) => {
  try {
    const {graphkbToken, body: {email, username}} = req;

    const {result: [{'@rid': groupId}]} = await graphkbGetReadonlyGroupId(graphkbToken);

    const gkbCreateResp = await graphkbAddUser(graphkbToken, username, email, groupId);
    if (/error/i.test(gkbCreateResp.name)) {
      const error = new Error(gkbCreateResp.message);
      error.name = gkbCreateResp.name; // Set the error name
      throw error;
    }
    return res.status(StatusCodes.CREATED).json(gkbCreateResp);
  } catch (error) {
    logger.error(`Error trying to create user on GraphKB, ${error}`);
    if (errorMap[error.name]) {
      const {status, message} = errorMap[error.name];
      return res.status(status).json({error: {message}});
    }

    return res.status(StatusCodes.SERVICE_UNAVAILABLE).json({
      error: {message: `GraphKB user creation error: ${error.message}`},
    });
  }
});

module.exports = router;
