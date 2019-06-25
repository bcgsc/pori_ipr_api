const jwt = require('jsonwebtoken');
const fs = require('fs');
const db = require('../models');
const keycloak = require('../api/keycloak');

const logger = require('../../lib/log');

const pubKey = ['production', 'development', 'test'].includes(process.env.NODE_ENV)
  ? fs.readFileSync('keys/prodkey.pem')
  : fs.readFileSync('keys/devkey.pem');

// Require Active Session Middleware
module.exports = async (req, res, next) => {
  // Get Authorization Header
  let token = req.header('Authorization') || '';
  let username;
  let expiry;

  // Report loader case for permanent token lookup
  const respToken = await db.models.userToken.findOne({
    where: {user_id: 23},
    attributes: {
      exclude: ['id'],
      include: [['user_id', 'id']],
    },
  });
  if (respToken.token === token) {
    req.user = respToken;
    return next();
  }

  // Check for basic authorization header
  if (token.includes('Basic')) {
    let credentials;
    try {
      credentials = Buffer.from(token.split(' ')[1], 'base64').toString('utf-8').split(':');
    } catch (err) {
      return res.status(400).json({message: 'The authentication header you provided was not properly formatted.'});
    }
    try {
      const respAccess = await keycloak.getToken(credentials[0], credentials[1]);
      token = respAccess.access_token;
    } catch (error) {
      logger.error('Authentication failed for entered username and password');
      return res.status(400).json({message: 'Authentication failed for entered username and password'});
    }
  }
  if (!token) {
    return res.status(403).json({message: 'Invalid authorization token'});
  }

  // Verify token using public key
  jwt.verify(token, pubKey, {algorithms: ['RS256']}, (err, decoded) => {
    if (err) {
      return res.status(403).json({message: 'Invalid or expired authorization token'});
    }
    // Check for IPR access
    if (!decoded.realm_access.roles.includes('IPR')) {
      return res.status(403).json({message: 'IPR Access Error'});
    }
    username = decoded.preferred_username;
    expiry = decoded.exp;
    return null;
  });

  // Lookup token in IPR database
  try {
    const respUser = await db.models.user.findOne({
      where: {username},
      attributes: {
        exclude: ['deletedAt', 'password', 'jiraToken', 'jiraXsrf'],
      },
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
      ],
    });
    if (!respUser) {
      return res.status(400).json({message: 'User does not exist'});
    }
    respUser.dataValues.expiry = expiry;
    req.user = respUser;
    return next();
  } catch (err) {
    return res.status(400).json({message: 'Invalid authorization token'});
  }
};
