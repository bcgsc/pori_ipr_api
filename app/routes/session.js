"use strict";

// app/routes/genomic/detailedGenomicAnalysis.js
let express = require('express'),
    ldapAuth = require(process.cwd() + '/app/libs/ldapAuth'),
    router = express.Router({mergeParams: true}),
    db = require(process.cwd() + '/app/models'),
    loader = require(process.cwd() + '/app/loaders/detailedGenomicAnalysis/alterations'),
    bcrypt = require('bcrypt'),
    moment = require('moment'),
    _ = require('lodash'),
    validator = require('validator'),
    Q = require('q'),
    $jira = require(process.cwd() + '/app/api/jira');

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
              // Successful Login
              if(!resp.errorMessages) {
                // Ensure we have a real JIRA token
                if(resp.session && resp.session.value) {

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
                  res.status(400).json({status: false, message: 'Unable to authenticate with the provided credentials.'});
                }
              }

              // Unsuccessful Login
              if(resp.errorMessages && resp.errorMessages.length > 0) {
                res.status(400).json({status: false, message: 'Unable to authenticate with the provided credentials.'});
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

        // TODO: Check BCGSC LDAP anyway, maybe they just haven't signed up for our accounts yet!

        res.status(400).json({error: { message: 'Unable to authenticate the provided credentials', code: 'invalidCredentials'}});
      }
    );
  });

router.route('/create')
  .post((req,res,next) => {

    // Create new user

    // Validate input
    let required_inputs = ['username', 'password', 'type', 'firstName', 'lastName', 'email', 'access'];
    let input_errors = [];

    // Inputs set
    _.forEach(required_inputs, (v) => {
      if(req.body[v] === undefined) {
        input_errors.push({
          input: v,
          message: v + ' is a required input'
        });
      }
    });

    // Check if email password is valid only if type=local
    if(req.body.type === 'local' && req.body.password.length > 8) input_errors.push({input: 'password', message: 'password must be at least 8 characters'});
    if(req.body.type === 'local' && validator.isLength(req.body.password, {min:8,max:250})) input_errors.push({input: 'password', message: 'password must be at least 8 characters'});

    if(!validator.isEmail(req.body.email)) input_errors.push({input: 'email', message: 'email address must be valid'});

    if(req.body.firstName.length < 1) input_errors.push({input: 'firstName', message: 'first name must be set'});
    if(req.body.lastName.length < 1) input_errors.push({input: 'lastName', message: 'last name must be set'});

    if(req.body.username.length < 2) input_errors.push({input: 'username', message: 'username must be set'});

    if(validator.isIn(req.body.access, [db.models.user.rawAttributes.access.values])) input_errors.push({input: 'access', message: 'user type must be one of: clinician, bioinformatician, analyst, administration, superuser'});

    if(validator.isIn(req.body.type, [db.models.user.rawAttributes.type.values])) input_errors.push({input: 'access', message: 'user type must be one of: clinician, bioinformatician, analyst, administration, superuser'});

    // Check if account
    emailInUse(req.body.email).then(
      (resp) => {
        if(resp) input_errors.push({input: 'email', message: 'email address is already registered.'});

        if(input_errors.length > 0) return res.status(400).json({errors: input_errors});

        // Hash password
        if(req.body.type === 'local') req.body.password = bcrypt.hashSync(req.body.password, 10);
        if(req.body.type === 'ldap') req.body.password = null;

        // Everything looks good, create the account!
        db.models.user.create(req.body).then(
          (resp) => {
            // Account created, send details
            res.json(resp);
          },
          (err) => {
            console.log('Unable to create user account', err);
            res.status(500).json({status: false, message: 'Unable to create user account.'});
          }
        );
      },
      (err) => {
        // Unable to lookup email address
        console.log(err);
        res.status(500).json({message: 'Unable to register account.'});
      }
    );
});

router.route('/all')
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


  router.route('/jiraTest')
  .post((req,res,next) => {

    $jira.authenticate(req.body.username, req.body.password).then(
      (resp) => {
        // Successful Login
        if(!resp.errorMessages) {
          // Ensure we have a real JIRA token
          if(resp.session && resp.session.value) {



          } else {
            res.status(400).json({status: false, message: 'Unable to authenticate with the provided credentials.'});
          }
        }

        // Unsuccessful Login
        if(resp.errorMessages && resp.errorMessages.length > 0) {
          res.status(400).json({status: false, message: 'Unable to authenticate with the provided credentials.'});
        }
      },
      (err) => {
        console.log('Error', err);
        res.status(500).json(err);
      }
    )

  });
  
module.exports = router;


/**
 * Check if an email address is in use.
 *
 * @param email
 * @returns {*|promise|boolean}
 */
let emailInUse= (email) => {
  let deferred = Q.defer();
  db.models.user.findAll({where: {email: email}}).then(
    (res) => {
      if(res.length > 0) deferred.resolve(true);
      if(res.length < 1) deferred.resolve(false);
    },
    (err) => {
      console.log('EmaiLInUse Failed', err);
      deferred.reject({status: false, message: 'Unable to lookup email in use status of: ' + email});
    }
  );
  return deferred.promise;
};

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