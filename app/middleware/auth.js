let _ = require('lodash'),
    router = require('express').Router({mergeParams: true}),
    db = require(process.cwd() + '/app/models');

let ignored = {
  files: ['index.js', 'POG.js', 'session.js'],
  routes: ['loadPog'],
}

// Require Active Session Middleware
module.exports = (req,res,next) => {
  
  // Get Authorization Header
  token = req.header('Authorization');
  
  // Test mode?
  if(process.env.NODE_ENV === 'test') {
    req.user = 1;
    return next();
  }
  // Send Admin Account
  if(token === "apitest0-e4af-437c-be95-1e3451d0c619" && process.env.NODE_ENV === 'development') {
    db.models.user.findOne({where: {username: 'admin'}, attributes: {exclude: ['id', 'password', 'deletedAt']}}).then(
      (user) => {
        req.user = user;
        next();
        return;
      },
      (error) => {
        console.log(error);
        return res.status(403).json({error: { message: 'Failed to validate development token', code: 'failedDevelopmentToken'}});
      }
    );
  } else {
    // Check for header token
    if(token === null || token === undefined) return res.status(403).json({error: { message: 'Invalid authorization token', code: 'invalidAuthorizationToken'}});
    
    // Lookup token
    db.models.userToken.findOne({where: {token: token}, include: [{model: db.models.user, as: 'user', attributes: {exclude:['id', 'password', 'deletedAt']}}]}).then(
      (result) => {
        if(result === null) return res.status(403).json({error: { message: 'Invalid authorization token', code: 'invalidAuthorizationToken'}});
        
        if(result.token) {
          req.user = result.user;
          next();
        }
      },
      (error) => {
        console.log(error);
        return res.status(403).json({error: { message: 'Invalid authorization token', code: 'invalidAuthorizationToken'}});
      }
    );
  }
  
}
