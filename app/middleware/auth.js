const jwt = require('jsonwebtoken');
const fs = require('fs');
const db = require('../../app/models');
const keycloak = require('../../app/api/keycloak');

const pubKey = fs.readFileSync('pubkey.pem');

// Require Active Session Middleware
module.exports = async (req, res, next) => {
  // Get Authorization Header
  let token = req.header('Authorization') || '';
  let username;

  // Check for basic authorization header
  if (token.includes('Basic')) {
    let credentials;
    try {
      credentials = Buffer.from(token.split(' ')[1], 'base64').toString('utf-8').split(':');
    } catch (e) {
      return res.status(400).json({message: 'The authentication header you provided was not properly formatted.'});
    }
    const resp = await keycloak.getToken(credentials[0], credentials[1]);
    token = resp.access_token;
  }
  if (!token) {
    return res.status(403).json({message: 'Invalid authorization token'});
  }

  // Verify token using public key
  jwt.verify(token, pubKey, {algorithms: ['RS256']}, (err, decoded) => {
    if (err) {
      return res.status(403).json({message: 'Invalid authorization token'});
    }
    // Check for IPR access
    if (!decoded.realm_access.roles.includes('IPR')) {
      return res.status(403).json({message: 'IPR Access Error'});
    }
    username = decoded.preferred_username;
    return null;
  });

  // Lookup token in IPR database
  try {
    const result = await db.models.user.findOne({
      where: {username},
      include: [
        {model: db.models.userGroup, as: 'groups', attributes: {exclude: ['id', 'user_id', 'owner_id', 'deletedAt', 'updatedAt', 'createdAt']}},
        {model: db.models.project, as: 'projects', attributes: {exclude: ['id', 'deletedAt', 'updatedAt', 'createdAt']}},
      ],
    });
    if (!result) {
      return res.status(400).json({message: 'User does not exist'});
    }
    // All good
    req.user = result;
    return next();
  } catch (err) {
    return res.status(400).json({message: 'Invalid authorization token'});
  }
};
