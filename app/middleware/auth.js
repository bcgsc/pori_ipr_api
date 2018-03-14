"use strict";

const moment      = require('moment');
const crypto      = require('crypto');
const _           = require('lodash');

const Session     = require(process.cwd() + '/app/libs/Session');
const db          = require(process.cwd() + '/app/models');

// Require Active Session Middleware
module.exports = (req,res,next) => {

  // Get Authorization Header
  let token = req.header('Authorization');

  if(token === undefined) {
    return res.status(401).json({message: 'Authorization failed to validate.'});
  }

  // Check for basic authorization header
  if(token.indexOf('Basic') > -1) {

    let credentials;
    try {
      credentials = new Buffer(token.split(' ')[1], 'base64').toString('utf-8').split(':');
    }
    catch(e) {
      return res.status(400).json({message: 'The authentication header you provided was not properly formatted.'});
    }

    let session = new Session(credentials[0], credentials[1], req, {noToken: true});

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
    if(token === null || token === undefined) return res.status(403).json({ message: 'Invalid authorization token'});
    if(!token.match(/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/)) return res.status(400).json({message: 'Invalid authorization token'});

    // Lookup token
    db.models.userToken.findOne({
      where: {token: token},
      include: [{
        model: db.models.user, as: 'user', attributes: {exclude: ['password', 'deletedAt']}, include: [
          {
            model: db.models.userGroup,
            as: 'groups',
            attributes: {exclude: ['id', 'user_id', 'owner_id', 'deletedAt', 'updatedAt', 'createdAt']}
          }
        ]
      }]
    }).then(
      (result) => {
        if(result === null) return res.status(400).json({message: 'Invalid authorization token'});
        // All good
        req.user = result.user;
        next();
      },
      (error) => {
        console.log('Bad authorization token: ', error);
        return res.status(400).json({message: 'Invalid authorization token'});
      }
    );
  }
  
};
