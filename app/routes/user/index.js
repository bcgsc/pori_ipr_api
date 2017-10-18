"use strict";

// app/routes/genomic/detailedGenomicAnalysis.js
let validator = require('validator'),
  express = require('express'),
  bcrypt = require('bcryptjs'),
  router = express.Router({mergeParams: true}),
  acl = require(process.cwd() + '/app/middleware/acl'),
  _ = require('lodash'),
  db = require(process.cwd() + '/app/models'),
  emailInUse = require(process.cwd() + '/app/libs/emailInUse');

// Route for getting a POG
router.route('/')

// Get All Users
  .get((req,res,next) => {

    // Access Control
    let access = new acl(req, res);
    access.read('admin', 'superUser');
    if(access.check() === false) return;

    db.models.user.all({
      attributes: {exclude: ['deletedAt', 'password', 'id', 'jiraToken', 'jiraXsrf']},
      order: 'username ASC',
      include: [
        {as: 'groups', model: db.models.userGroup, attributes: {exclude: ['id', 'user_id', 'owner_id', 'deletedAt', 'updatedAt', 'createdAt']}, include: []}
      ]
    }).then(
      (users) => {
        // Get current user
        res.json(users);
      },
      (res) => {

      }
    );

  })
  .post((req,res,next) => {
    // Add new user

    // Validate input
    let required_inputs = ['username', 'password', 'type', 'firstName', 'lastName', 'email'];
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

    // Check for existing account.
    db.models.user.findOne({where: {username: req.body.username, deletedAt: {$not: null}}, paranoid: false}).then(
      (existCheck) => {
        if(existCheck !== null) {
          // Restore!
          db.models.user.update({deletedAt: null}, {paranoid:false,where:{ident: existCheck.ident}, returning: true}).then(
            (user) => {

              let response = {
                ident: user[1][0].ident,
                username: user[1][0].username,
                type: user[1][0].type,
                firstName: user[1][0].firstName,
                lastName: user[1][0].lastName,
                email: user[1][0].email,
                access: user[1][0].access,
                settings: user[1][0].settings,
                createdAt: user[1][0].createdAt,
                updatedAt: user[1][0].updatedAt,
                lastLogin: user[1][0].lastLogin
              };

              res.json(response);
            },
            (err) => {
              console.log('Unable to restore username', err);
              res.status(500).json({error: {message: 'Unable to restore existing username', code: 'failedUsernameCheckQuery'}});
            }
          )

        }

        if(existCheck === null) {

          // Check if email password is valid only if type=local
          if(req.body.type === 'local' && req.body.password.length < 8) input_errors.push({input: 'password', message: 'password must be at least 8 characters'});

          if(!validator.isEmail(req.body.email)) input_errors.push({input: 'email', message: 'email address must be valid'});

          if(req.body.firstName.length < 1) input_errors.push({input: 'firstName', message: 'first name must be set'});
          if(req.body.lastName.length < 1) input_errors.push({input: 'lastName', message: 'last name must be set'});

          if(req.body.username.length < 2) input_errors.push({input: 'username', message: 'username must be set'});

          //if(validator.isIn(req.body.access, [db.models.user.rawAttributes.access.values])) input_errors.push({input: 'access', message: 'user type must be one of: clinician, bioinformatician, analyst, administration, superuser'});

          req.body.access = "clinician";

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
        }
      },
      (err) => {
        console.log('Unable to check for existing username', err);
        res.status(500).json({error: {message: 'unable to check if this username has been taken', code: 'failedUserNameExistsQuery'}});
      }
    );

  });

router.route('/me')
  .get((req,res,next) => {
    // Getting self
    let me = {
      ident: req.user.ident,
      username: req.user.username,
      type: req.user.type,
      firstName: req.user.firstName,
      lastName: req.user.lastName,
      email: req.user.email,
      jiraToken: req.user.jiraToken,
      jiraXsrf: req.user.jiraXsrf,
      access: req.user.access,
      settings: req.user.settings,
      lastLogin: req.user.lastLogin,
      createdAt: req.user.createdAt,
      updatedAt: req.user.updatedAt,
      groups: req.user.groups
    };

    return res.json(me);
  });

router.route('/settings')
  .get((req,res,next) => {
    res.json(req.user.get('settings'));
  })
  .put((req,res,next) => {

    db.models.user.update(req.body, {where: {ident: req.user.ident}}).then(
      (user) => {
        res.json()
      }
    )

  });

router.route('/:ident([A-z0-9-]{36})')
  .get((req,res,next) => {
    // Getting self
    return res.json(req.user);
  })

  .put((req,res,next) => {
    // Update current user

    // Access Control
    let access = new acl(req, res);
    access.write('*'); // Anyone is allowed to edit their account details. Controller later protects non-self edits.
    if(access.check() === false) return;
    
    
    // Editing someone other than self?
    if(req.user.ident !== req.params.ident && req.user.access !== 'superUser') {
      res.status(403).json({status: false, message: 'You are not allowed to perform this action'});
      return;
    }
    

    // Check Access
    if(req.user.access !== 'superUser') {
      if(req.body.access && req.body.access !== req.user.access) return res.status(400).json({error: { message: 'You are not able to update your own access', code: 'failUpdateAccess'}});
      if(req.body.username && req.body.username !== req.user.username) return res.status(400).json({error: { message: 'You are not able to update your username', code: 'failUpdateUsername'}});
      if(req.body.type && req.body.type !== req.user.type) return res.status(400).json({error: { message: 'You are not able to update your account type', code: 'failUpdateType'}});
      if(req.body.password && req.body.password && req.body.password.length < 8) return res.status(400).json({error: { message: 'Password must be 8 characters or more.', code: 'failUpdateType'}});
    }

    let updateBody = {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      email: req.body.email,
    };

    if(req.body.settings) updateBody.settings = req.body.settings;

    //if(req.body.password && req.body.password.length > 5) updateBody.password = bcrypt.hashSync(req.body.password, 10);
    if(req.body.password && req.body.password.length > 5) updateBody.password = bcryptjs.hashSync(req.body.password, 10);

    // Attempt user model update
    db.models.user.update(updateBody, { where: {ident: req.user.ident}, limit: 1 }).then(
      (result) => {
        if(typeof result === 'Object') {
          res.json(result);
        } else {
          // Success, get user -- UGH
          db.models.user.findOne({where: {ident: req.user.ident}, attributes: {exclude: ['id', 'password', 'deletedAt']}}).then(
            (user) => {
              res.json(user);
            },
            (error) => {
              res.status(500).json({error: { message: 'Unable to retrieve your account. Please try again', code: 'failedUserLookupQuery'}});
            }
          );
        }
      },
      (error) => {
        res.status(500).json({error: { message: 'Unable to update your account. Please try again', code: 'failedUserUpdateQuery'}});
      }
    );
  })
  // Remove a user
  .delete((req,res,next) => {

    // Remove a user
    let access = new acl(req, res);
    access.write('admin','superUser');
    if(access.check() === false) return res.status(403).send();

    // Find User
    db.models.user.destroy({where: {ident: req.params.ident}, limit:1}).then(
      (resp) => {
        if(resp === null) res.status(400).json({error: {message: 'Unable to remove the requested user', code: 'failedUserRemove'}});

        res.status(204).send();
      },
      (err) => {
        console.log('SQL Failed User remove', err);
        res.status(500).json({error: {message: 'Unable to remove the requested user', code: 'failedUserRemoveQuery'}});
      }
    )

  });

// User Search
router.route('/search')
  .get((req,res,next) => {
    let query = req.query.query;

    let where = {
      $or: [
        {firstName: {$ilike: '%'+query+'%'}},
        {lastName: {$ilike: '%'+query+'%'}},
        {username: {$ilike: '%'+query+'%'}},
      ]
    };

    db.models.user.findAll({where: where, attributes: {exclude:['deletedAt','id', 'password', 'jiraToken']}}).then(
      (results) => {
        res.json(results);
      },
      (err) => {
        console.log('Error', err);
        res.status(500).json({error: {message: 'Unable to query user search'}});
      }
    )
  });

module.exports = router;