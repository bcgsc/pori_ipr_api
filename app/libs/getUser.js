const HTTP_STATUS = require('http-status-codes');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const db = require('../models');
const keycloak = require('../api/keycloak');
const nconf = require('../config');
const cache = require('../cache');

const logger = require('../log');

const pubKey = fs.readFileSync(nconf.get('keycloak:keyfile')).toString();

const include = [
  {
    model: db.models.userGroup,
    as: 'groups',
    attributes: {
      exclude: ['id', 'deletedAt', 'updatedAt', 'createdAt', 'updatedBy'],
    },
    through: {attributes: []},
  },
  {
    model: db.models.project,
    as: 'projects',
    attributes: {
      exclude: ['id', 'deletedAt', 'updatedAt', 'createdAt', 'updatedBy'],
    },
    through: {attributes: []},
  },
  {
    model: db.models.userMetadata,
    as: 'metadata',
    attributes: {
      exclude: ['id', 'deletedAt', 'updatedAt', 'createdAt', 'updatedBy', 'userId'],
    },
  },
];

const getUser = async (req, res) => {
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
    return res.status(HTTP_STATUS.FORBIDDEN).json({message: 'IPR Access Error: Keycloak role missing'});
  }
  const username = decoded.preferred_username;
  const expiry = decoded.exp;

  // Middleware for user
  // Check cache for user
  const key = `/user/${username}`;
  let respUser;
  let cacheUser;

  try {
    cacheUser = await cache.get(key);
  } catch (error) {
    logger.error(`Error during user cache get ${error}`);
  }

  if (cacheUser) {
    respUser = db.models.user.build(JSON.parse(cacheUser), {
      raw: true,
      isNewRecord: false,
      include,
    });
  } else {
    try {
      respUser = await db.models.user.findOne({
        where: {username},
        attributes: {exclude: ['password']},
        include,
      });
    } catch (err) {
      logger.error(err);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({message: 'Invalid authorization token'});
    }

    if (!respUser) {
      logger.error(`User (${username}) does not exist`);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({message: 'User does not exist'});
    }

    // Add result to cache
    cache.set(key, JSON.stringify(respUser), 'EX', 14400);
  }

  respUser.dataValues.expiry = expiry;
  return respUser;
};

module.exports = {
  getUser,
};
