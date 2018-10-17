const jwt = require('jsonwebtoken');
const fs = require('fs');
const Session = require('../../app/libs/Session');
const db = require('../../app/models');

const pubKey = fs.readFileSync('pubkey.pem');

// Require Active Session Middleware
module.exports = (req, res, next) => {
  // Get Authorization Header
  const token = req.header('Authorization');
  let username;

  if (token === undefined) {
    return res.status(401).json({message: 'Authorization failed to validate.'});
  }

  // Check for basic authorization header
  if (token.indexOf('Basic') > -1) {
    let credentials;
    try {
      credentials = new Buffer(token.split(' ')[1], 'base64').toString('utf-8').split(':');
    } catch (e) {
      return res.status(400).json({message: 'The authentication header you provided was not properly formatted.'});
    }

    const session = new Session(credentials[0], credentials[1], req, {noToken: true});

    session.authenticate().then(
      (result) => {
        if(result) {
          req.user = session.user;
          next(); // All good
        } else {
          return res.status(400).json({message: 'Authorization failed to validate'});
        }
      },
      (err) => {
        console.log('Error validation basic authorization header', err);
        return res.status(400).json({message: 'Authorization failed to validate'});
      }
    )
      .catch((e) => {
        console.log('Error validation basic authorization header', e);
        return res.status(400).json({message: 'Authorization failed to validate'});
      });
  } else {
    // Check for header token
    if (token === null || token === undefined) {
      return res.status(403).json({message: 'Invalid authorization token'});
    }
    jwt.verify(token, pubKey, {algorithms: ['RS256']}, (err, decoded) => {
      if (err) {
        return res.status(403).json({message: 'Invalid authorization token'});
      }
      if (decoded.realm_access.roles.indexOf('IPR') === -1) {
        return res.status(403).json({message: 'IPR Access Error'});
      }
      username = decoded.preferred_username;
      return null;
    });
    // Lookup token
    db.models.user.findOne({
      where: {username},
      include: [
        {model: db.models.userGroup, as: 'groups', attributes: {exclude: ['id', 'user_id', 'owner_id', 'deletedAt', 'updatedAt', 'createdAt']}},
        {model: db.models.project, as: 'projects', attributes: {exclude: ['id', 'deletedAt', 'updatedAt', 'createdAt']}},
      ],
    })
      .then((result) => {
        if (result === null) {
          return res.status(400).json({message: 'User does not exist'});
        }
        // All good
        req.user = result;
        return next();
      })
      .catch((error) => {
        console.log('Bad authorization token: ', error);
        return res.status(400).json({message: 'Invalid authorization token'});
      });
  }
};
