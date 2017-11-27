"use strict";

// app/routes/genomic/detailedGenomicAnalysis.js
let express = require('express'),
    ldapAuth = require(process.cwd() + '/app/libs/ldapAuth'),
    router = express.Router({mergeParams: true}),
    db = require(process.cwd() + '/app/models'),
    moment = require('moment'),
    _ = require('lodash'),
    validator = require('validator'),
    Q = require('q'),
    $jira = require(process.cwd() + '/app/api/jira'),
    crypto = require('crypto'),
    emailInUse = require(process.cwd() + '/app/libs/emailInUse');

let Session     = require(process.cwd() + '/app/libs/Session');

// Route for authentication actions
router.route('/')
  .post((req,res,next) => {

    // Attempt to authenticate
    if(req.body.username === null || req.body.username === undefined || req.body.password === null || req.body.password === undefined) res.status(400).json({error: {message: 'Insufficient credentials were provided for authentication', code: 'invalidCredentials'}});

    // Get fields
    let username = req.body.username,
        password = req.body.password;

    let session = new Session(username, password, req);
    
    let token;
    
    session.authenticate()
      .then((result) => {
      
        token = result.token;
        
        // Retrieve full user
        let opts = {
          where: {ident: result.user.ident},
          attributes: { exclude: ['password', 'deletedAt', 'jiraToken', 'jiraXsrf']},
          include: [
            { model: db.models.userGroup, as: 'groups', attributes: {exclude: ['id', 'user_id', 'owner_id', 'deletedAt', 'updatedat', 'createdAt']} }
          ]
        };
        
        return db.models.user.findOne(opts);
      })
      .then((user) => {
        res.set('X-token', token);
        res.json(user);
      })
      .catch((err) => {
        console.log('Failed to authenticate', err);
        if(err.code === 'failedAuthentication' || err.code === 'userNotFound') res.status(400).json({message: "unable to authenticate"});
      });

  })
  .delete((req,res,next) => {
    // Delete Token
    let token = req.header('Authorization');

    if(token === null || token === undefined) return res.status(404).json({error: {message: 'Unable to destroy your session', code: 'noUserTokenSent'}});

    // Remove Entry
    db.models.userToken.destroy({ where: {token: token} }).then(
      (result) => {
        res.status(204).send();
      },
      (error) => {
        res.status(500).json({error: {message: 'Unable to destroy your session', code: 'failedUserTokenDestroy'}});
      }
    );
  });

router.route('/validate')
  .post((req,res) => {

    // Validate a token to determine it's truthiness
    let token = req.body.token;

    // Lookup token
    db.models.userToken.findOne({where: {token: token}}).then(
      (result) => {
        if(result !== null) return res.json({valid: true});
        if(result === null) return res.json({valid: false});
        res.json({valid:false});
      },
      (err) => {
        if(err.message.indexOf('invalid input syntax for uuid') > -1) return res.status(400).json({error: {message: 'The UUID you supplied is not valid.', code: 'invalidUUID'}});
        console.log('SQL error', err);
        res.status(500).json({error: {message: 'Unable to validate the provided authentication token.', code: 'failedTokenValidationError'}});
      }
    )

  });

module.exports = router;

/**
 * Create authentication token
 *
 * @param user
 * @returns {*|promise|string}
 */
let createToken = (user, req) => {

  let deferred = Q.defer();

  // Good auth, create token.
  db.models.userToken.create({ user_id: user.id, userAgent: req.header('user-agent'), expiresAt: moment().add(24, 'hours').format('YYYY-MM-DD HH:mm:ss.SSS Z')}).then(
    (result) => {
      deferred.resolve(result.token);
    },
    (error) => {
      console.log('Unable to create token', error);
      deferred.reject(false);
    }
  );

  return deferred.promise;

};