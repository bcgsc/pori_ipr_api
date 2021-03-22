const HTTP_STATUS = require('http-status-codes');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const db = require('../models');
const keycloak = require('../api/keycloak');
const nconf = require('../config');

const logger = require('../log');

const pubKey = fs.readFileSync(nconf.get('keycloak:keyfile')).toString();

// Require Active Session Middleware
module.exports = async (req, res, next) => {
  // Get Authorization Header
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
      const respAccess = await keycloak.getToken(credentials[0], credentials[1]);
      token = respAccess.access_token;
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

  // Verify token using public key
  let decoded;
  try {
    decoded = await jwt.verify(token, pubKey, {algorithms: ['RS256']});
  } catch (err) {
    logger.debug(`token verification failed against key ${nconf.get('keycloak:keyfile')}`);
    return res.status(HTTP_STATUS.FORBIDDEN).json({message: `Invalid or expired authorization token: (${err.message})`});
  }
  // Check for IPR access
  if (!decoded.realm_access.roles.includes(nconf.get('keycloak:role'))) {
    return res.status(HTTP_STATUS.FORBIDDEN).json({message: 'IPR Access Error'});
  }
  const username = decoded.preferred_username;
  const expiry = decoded.exp;

  // Lookup token in IPR database
  // Middleware for user
  try {
    const respUser = await db.models.user.findOne({
      where: {username},
      include: [
        {
          model: db.models.userGroup,
          as: 'groups',
          attributes: {
            exclude: ['owner_id', 'deletedAt', 'updatedAt', 'createdAt'],
          },
        },
        {
          model: db.models.project,
          as: 'projects',
          attributes: {
            exclude: ['deletedAt', 'updatedAt', 'createdAt'],
          },
        },
        {
          model: db.models.userMetadata.scope('public'),
          as: 'metadata',
        },
      ],
    });

    if (!respUser) {
      logger.error(`User (${username}) does not exist`);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({message: 'User does not exist'});
    }

    respUser.dataValues.expiry = expiry;
    req.user = respUser;
    return next();
  } catch (err) {
    logger.error(err);
    return res.status(HTTP_STATUS.BAD_REQUEST).json({message: 'Invalid authorization token'});
  }
};
