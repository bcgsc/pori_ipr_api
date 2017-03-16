"use strict";

// app/routes/genomic/detailedGenomicAnalysis.js
let express = require('express'),
    ldapAuth = require(process.cwd() + '/app/libs/ldapAuth'),
    router = express.Router({mergeParams: true}),
    db = require(process.cwd() + '/app/models'),
    bcrypt = require(process.cwd() + '/lib/bcrypt'),
    moment = require('moment'),
    _ = require('lodash'),
    validator = require('validator'),
    Q = require('q'),
    $jira = require(process.cwd() + '/app/api/jira'),
    crypto = require('crypto'),
    emailInUse = require(process.cwd() + '/app/libs/emailInUse');

// Route for authentication actions
router.route('/')
  .post((req,res,next) => {

    // Attempt to authenticate
    if(req.body.username === null || req.body.username === undefined || req.body.password === null || req.body.password === undefined) res.status(400).json({error: {message: 'Insufficient credentials were provided for authentication', code: 'invalidCredentials'}});

    // Get fields
    let username = req.body.username,
        password = req.body.password;

    // Attempt to find username
    db.models.user.findOne({ where: {username: username}}).then(
      (user) => {

        if(user === null) return res.status(400).json({error: { message: 'Unable to authenticate the provided credentials', code: 'invalidCredentials'}});

        // User found!
        if(user.type === 'local') {
          // Check password hashing
          if(bcrypt.compareSync(password, user.password)) {
            createToken(user, req).then(
              (token) => {
                res.set('X-token', token);
                res.json({
                  ident: user.ident,
                  username: user.username,
                  type: user.type,
                  firstName: user.firstName,
                  lastName: user.lastName,
                  email: user.email,
                  access: user.access
                });
              },
              (error) => {
                res.status(500).json({message: 'Unable to create user token'});
              }
            ); // End create token
            
          } else {
            res.status(400).json({error: { message: 'Unable to authenticate the provided credentials', code: 'invalidCredentials'}});
          }
          
        }

        // Attempt BCGSC LDAP Authentication
        if(user.type === 'bcgsc') {

          $jira.authenticate(req.body.username, req.body.password).then(
            (resp) => {
              // Ensure we have a real JIRA token -- Successful Login
              if(!resp.data.errorMessages && resp.data.session && resp.data.session.value) {
                
                // Extract cookie values
                let cookies = resp.raw.headers["set-cookie"];
                let xsrf, jToken;
                _.forEach(cookies, (c) => {
                  // get tokens from headers
                  if(c.indexOf('JSESSIONID') !== -1) jToken = c.match(/=([A-z0-9-|]*)/)[0].replace('=','');
                });

                // Update User Entry
                user.jiraXsrf = xsrf;
                user.jiraToken = jToken;
                user.save(); // Save Changes to User;

                createToken(user, req).then(
                  (token) => {

                    res.set('X-token', token);
                    res.json({
                      ident: user.ident,
                      username: user.username,
                      type: user.type,
                      firstName: user.firstName,
                      lastName: user.lastName,
                      email: user.email,
                      access: user.access
                    });
                  },
                  (error) => {
                    res.status(500).json({message: 'Unable to create user token'});
                  }
                ); // End create token
              } else {

                res.status(400).json({ status: false, message: 'Unable to authenticate with the provided credentials.' });
              }
            },
            (err) => {
              console.log('Error', err);
              res.status(500).json(err);
            }
          );

        } // End attempt BCGSC LDAP Auth

      }, // End user exists in DB...
      (error) => {

        // TODO: Check BCGSC JIRA anyway, maybe they just haven't signed up for our accounts yet!

        res.status(400).json({error: { message: 'Unable to authenticate the provided credentials', code: 'invalidCredentials'}});
      }
    );
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