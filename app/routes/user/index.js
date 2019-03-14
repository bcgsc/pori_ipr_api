'use strict';

// app/routes/genomic/detailedGenomicAnalysis.js
const validator = require('validator');
const express = require('express');
const bcrypt = require('bcryptjs');

const router = express.Router({mergeParams: true});
const Acl = require(`${process.cwd()}/app/middleware/acl`);
const _ = require('lodash');

const db = require(`${process.cwd()}/app/models`);

// Route for getting a POG
router.route('/')

// Get All Users
  .get(async (req, res) => {
    // Access Control
    const access = new Acl(req, res);
    access.read = ['admin', 'superUser'];
    if (access.check() === false) return;

    try {
      // Get current user
      const users = await db.models.user.all({
        attributes: {exclude: ['deletedAt', 'password', 'id', 'jiraToken', 'jiraXsrf']},
        order: [['username', 'ASC']],
        include: [
          {as: 'groups', model: db.models.userGroup, attributes: {exclude: ['id', 'user_id', 'owner_id', 'deletedAt', 'updatedAt', 'createdAt']}},
          {as: 'projects', model: db.models.project, attributes: {exclude: ['id', 'deletedAt', 'updatedAt', 'createdAt']}},
        ],
      });
      res.json(users);
    } catch (error) {
      console.log('Unable to restore username', error);
      res.status(500).json({error: {message: error.message, code: error.code}});
    }
  })
  .post(async (req, res) => {
    // Add new user

    // Validate input
    const requiredInputs = ['username', 'password', 'type', 'firstName', 'lastName', 'email'];
    const inputErrors = [];

    // Inputs set
    _.forEach(requiredInputs, (v) => {
      if (req.body[v] === undefined) {
        inputErrors.push({
          input: v,
          message: `${v} is a required input`,
        });
      }
    });

    try {
      // Check for existing account.
      const existCheck = await db.models.user.findOne({where: {username: req.body.username, deletedAt: {$not: null}}, paranoid: false});
      if (existCheck !== null) {

        // set up user to restore with updated field values
        const restoreUser = req.body;
        restoreUser['deletedAt'] = null;

        const user = await db.models.user.update(restoreUser, {paranoid: false, where: {ident: existCheck.ident}, returning: true});
        const response = {
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
          lastLogin: user[1][0].lastLogin,
        };

        res.json(response);

      } else {
        // Check if email password is valid only if type=local
        if (req.body.type === 'local' && req.body.password.length < 8) inputErrors.push({input: 'password', message: 'password must be at least 8 characters'});

        if (!validator.isEmail(req.body.email)) inputErrors.push({input: 'email', message: 'email address must be valid'});

        if (req.body.firstName.length < 1) inputErrors.push({input: 'firstName', message: 'first name must be set'});
        if (req.body.lastName.length < 1) inputErrors.push({input: 'lastName', message: 'last name must be set'});

        if (req.body.username.length < 2) inputErrors.push({input: 'username', message: 'username must be set'});

        // if(validator.isIn(req.body.access, [db.models.user.rawAttributes.access.values])) input_errors.push({input: 'access', message: 'user type must be one of: clinician, bioinformatician, analyst, administration, superuser'});

        req.body.access = 'clinician';

        if (validator.isIn(req.body.type, [db.models.user.rawAttributes.type.values])) inputErrors.push({input: 'access', message: 'user type must be one of: clinician, bioinformatician, analyst, administration, superuser'});

        if (inputErrors.length > 0) return res.status(400).json({errors: inputErrors});

        // Hash password
        if (req.body.type === 'local') req.body.password = bcrypt.hashSync(req.body.password, 10);
        if (req.body.type === 'ldap') req.body.password = null;

        // Everything looks good, create the account!
        const resp = await db.models.user.create(req.body);
        // Account created, send details
        res.json(resp);
      }
    } catch (error) {
      console.log(error);
      res.status(500).json(error);
    }
  });

router.route('/me')
  .get((req, res) => res.json(req.user));

router.route('/settings')
  .get((req, res) => {
    res.json(req.user.get('settings'));
  })
  .put(async (req, res) => {
    await db.models.user.update(req.body, {where: {ident: req.user.ident}});
    res.json();
  });

router.route('/:ident([A-z0-9-]{36})')
  .get((req, res) => {
    // Getting self
    return res.json(req.user);
  })

  .put(async (req, res) => {
    // Update current user

    // Access Control
    const access = new Acl(req, res);
    access.write = ['*']; // Anyone is allowed to edit their account details. Controller later protects non-self edits.
    if (access.check() === false) return;
    
    // Editing someone other than self?
    if (req.user.ident !== req.body.ident && req.user.access !== 'superUser') {
      res.status(403).json({status: false, message: 'You are not allowed to perform this action'});
      return;
    }

    // Check Access
    if (req.user.access !== 'superUser') {
      if (req.body.access && req.body.access !== req.user.access) { res.status(400).json({error: {message: 'You are not able to update your own access', code: 'failUpdateAccess'}}); return; }
      if (req.body.username && req.body.username !== req.user.username) { res.status(400).json({error: {message: 'You are not able to update your username', code: 'failUpdateUsername'}}); return; }
      if (req.body.type && req.body.type !== req.user.type) { res.status(400).json({error: {message: 'You are not able to update your account type', code: 'failUpdateType'}}); return; }
    }

    if (req.body.password && req.body.password && req.body.password.length < 8) { res.status(400).json({error: {message: 'Password must be 8 characters or more.', code: 'failUpdateType'}}); return; }

    const updateBody = {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      email: req.body.email,
    };

    if (req.body.settings) updateBody.settings = req.body.settings;

    // if(req.body.password && req.body.password.length > 5) updateBody.password = bcrypt.hashSync(req.body.password, 10);
    if (req.body.password && req.body.password.length > 7) updateBody.password = bcrypt.hashSync(req.body.password, 10);

    try {
      // Attempt user model update
      const result = await db.models.user.update(updateBody, {where: {ident: req.body.ident}, returning: true, limit: 1});
      if (typeof result === 'Object') {
        res.json(result);
      } else {
        // Success, get user -- UGH
        const user = await db.models.user.findOne({
          where: {ident: result[1][0].ident},
          attributes: {exclude: ['id', 'password', 'deletedAt']},
          include: [
            {as: 'groups', model: db.models.userGroup, attributes: {exclude: ['id', 'user_id', 'owner_id', 'deletedAt', 'updatedAt', 'createdAt']}},
            {as: 'projects', model: db.models.project, attributes: {exclude: ['id', 'deletedAt', 'updatedAt', 'createdAt']}},
          ],
        });
        res.json(user);
      }
    } catch (error) {
      console.log(error);
      res.status(500).json(error);
    }
  })
  // Remove a user
  .delete(async (req, res) => {
    // Remove a user
    const access = new Acl(req, res);
    access.write = ['admin', 'superUser'];
    if (access.check() === false) return res.status(403).send();

    try {
      // Find User
      const result = await db.models.user.destroy({where: {ident: req.params.ident}, limit: 1});
      if (result === null) return res.status(400).json({error: {message: 'Unable to remove the requested user', code: 'failedUserRemove'}});

      return res.status(204).send();
    } catch (error) {
      console.log('SQL Failed User remove', error);
      return res.status(500).json({error: {message: 'Unable to remove the requested user', code: 'failedUserRemoveQuery'}});
    }
  });

// User Search
router.route('/search')
  .get((req, res) => {
    const query = req.query.query;

    const where = {
      $or: [
        {firstName: {$ilike: `%${query}%`}},
        {lastName: {$ilike: `%${query}%`}},
        {username: {$ilike: `%${query}%`}},
      ],
    };

    db.models.user.findAll({where, attributes: {exclude: ['deletedAt', 'id', 'password', 'jiraToken']}}).then(
      (results) => {
        res.json(results);
      },
      (err) => {
        console.log('Error', err);
        res.status(500).json({error: {message: 'Unable to query user search'}});
      }
    );
  });

module.exports = router;
