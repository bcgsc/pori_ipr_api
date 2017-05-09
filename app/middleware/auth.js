"use strict";

let _ = require('lodash'),
    router = require('express').Router({mergeParams: true}),
    moment = require('moment'),
    db = require(process.cwd() + '/app/models');

let ignored = {
  files: ['index.js', 'POG.js', 'session.js'],
  routes: ['loadPog'],
};

// Require Active Session Middleware
module.exports = (req,res,next) => {

  // Get Authorization Header
  let token = req.header('Authorization');
  
  // Test mode?
  if(process.env.NODE_ENV === 'test') {
    req.user = 1;
    return next();
  }

  // Check for header token
  if(token === null || token === undefined) return res.status(403).json({error: { message: 'Invalid authorization token', code: 'invalidAuthorizationToken'}});

  // Lookup token
  db.models.userToken.findOne({
    where: {token: token},
    include: [{model: db.models.user, as: 'user', attributes: {exclude:['password', 'deletedAt']}, include: [
      {model: db.models.userGroup, as: 'groups', attributes: {exclude: ['id', 'user_id', 'owner_id', 'deletedAt', 'updatedAt', 'createdAt']}}
    ]}]
  }).then(
    (result) => {
      if(result === null) return res.status(403).json({error: { message: 'Invalid authorization token', code: 'invalidAuthorizationToken'}});

      // Token has expired!
      if(moment(result.expiresAt).diff(moment(), 'seconds') < 0 && !result.permanentToken) {
        result.destroy();
        return res.status(403).json({error: { message: 'Invalid authorization token', code: 'invalidAuthorizationToken'}});
      }

      // Refresh the token if it's more than 1 hour old.
      if(moment(result.expiresAt).diff(moment(), 'seconds') < 82800 && !result.permanentToken) {
        result.expiresAt = moment().add(24, 'hours');
        result.save();
      }

      if(result.token) {
        req.user = result.user;

        db.models.user.update({lastLogin: db.fn('NOW')}, {where: {ident: result.user.ident}});
        next();

      }
    },
    (error) => {
      console.log(error);
      return res.status(403).json({error: { message: 'Invalid authorization token', code: 'invalidAuthorizationToken'}});
    }
  );
  
};
