const validator = require('validator');
const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../../models');
const Acl = require('../../middleware/acl');
const logger = require('../../../lib/log');

const router = express.Router({mergeParams: true});

// Route for getting a POG
router.route('/')
  // Get All Users
  .get(async (req, res) => {
    // Access Control
    const access = new Acl(req, res);
    access.read = ['admin', 'superUser'];
    if (!access.check()) {
      logger.error('User isn\'t allowed to access this');
      return res.status(403).send();
    }

    try {
      // Get users
      const users = await db.models.user.all({
        attributes: {exclude: ['deletedAt', 'password', 'id', 'jiraToken', 'jiraXsrf']},
        order: [['username', 'ASC']],
        include: [
          {as: 'groups', model: db.models.userGroup, attributes: {exclude: ['id', 'user_id', 'owner_id', 'deletedAt', 'updatedAt', 'createdAt']}},
          {as: 'projects', model: db.models.project, attributes: {exclude: ['id', 'deletedAt', 'updatedAt', 'createdAt']}},
        ],
      });
      return res.json(users);
    } catch (error) {
      logger.error(`SQL Error unable to get current user ${error}`);
      return res.status(500).json({error: {message: 'Unable to get current user', code: 'failedCurrentUserLookup'}});
    }
  })
  .post(async (req, res) => {
    // Add new user
    // Validate input
    const requiredInputs = ['username', 'password', 'type', 'firstName', 'lastName', 'email'];
    const inputErrors = [];

    // Inputs set
    requiredInputs.forEach((value) => {
      // Password can be null if type is ldap
      if (req.body[value] === undefined) {
        inputErrors.push({
          input: value,
          message: `${value} is a required input`,
        });
      }
    });

    let existCheck;
    try {
      // Check for existing account.
      existCheck = await db.models.user.findOne({where: {username: req.body.username, deletedAt: {$not: null}}, paranoid: false});
    } catch (error) {
      logger.error(`SQL Error unable to check for existing username ${error}`);
      return res.status(500).json({error: {message: 'Unable to check if this username has been taken', code: 'failedUserNameExistsQuery'}});
    }

    if (existCheck) {
      // set up user to restore with updated field values
      const restoreUser = req.body;
      restoreUser.deletedAt = null;

      try {
        const user = await db.models.user.update(restoreUser, {
          where: {ident: existCheck.ident},
          paranoid: false,
          returning: true,
        });

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

        return res.json(response);
      } catch (error) {
        logger.error(`Unable to restore username ${error}`);
        return res.status(500).json({error: {message: 'Unable to restore existing username', code: 'failedUsernameCheckQuery'}});
      }
    }

    // Check if email password is valid only if type=local
    if (req.body.type === 'local' && req.body.password.length < 8) {
      inputErrors.push({input: 'password', message: 'password must be at least 8 characters'});
    }

    if (!validator.isEmail(req.body.email)) {
      inputErrors.push({input: 'email', message: 'email address must be valid'});
    }

    if (req.body.firstName.length < 1) {
      inputErrors.push({input: 'firstName', message: 'first name must be set'});
    }

    if (req.body.lastName.length < 1) {
      inputErrors.push({input: 'lastName', message: 'last name must be set'});
    }

    if (req.body.username.length < 2) {
      inputErrors.push({input: 'username', message: 'username must be set'});
    }

    req.body.access = 'clinician';

    if (validator.isIn(req.body.type, [db.models.user.rawAttributes.type.values])) {
      inputErrors.push({input: 'type', message: 'user type must be one of: bcgsc, local'});
    }

    if (inputErrors.length > 0) {
      logger.error(`Input contains this/these error(s) ${inputErrors}`);
      return res.status(400).json({errors: inputErrors});
    }

    // Hash password
    if (req.body.type === 'local') {
      req.body.password = bcrypt.hashSync(req.body.password, 10);
    } else if (req.body.type === 'ldap') {
      req.body.password = null;
    }

    try {
      // Everything looks good, create the account!
      const resp = await db.models.user.create(req.body);
      // Account created, send details
      return res.json(resp);
    } catch (error) {
      logger.error(`Unable to create user account ${error}`);
      return res.status(500).json({status: false, message: 'Unable to create user account.'});
    }
  });

router.route('/me')
  .get((req, res) => {
    return res.json(req.user);
  });

router.route('/settings')
  .get((req, res) => {
    return res.json(req.user.get('settings'));
  })
  .put(async (req, res) => {
    try {
      const update = await db.models.user.update(req.body, {
        where: {ident: req.user.ident},
      });
      return res.json(update);
    } catch (error) {
      logger.error(`SQL Error unable to update user ${error}`);
      return res.status(500).json({error: {message: 'Unable to update user', code: 'failedUserUpdate'}});
    }
  });

router.route('/:ident([A-z0-9-]{36})')
  .put(async (req, res) => {
    // Update current user
    // Access Control
    const access = new Acl(req, res);
    access.write = ['*']; // Anyone is allowed to edit their account details. Controller later protects non-self edits.
    if (!access.check()) {
      logger.error('User isn\'t allowed to update current user');
      return res.status(403).send();
    }

    // Editing someone other than self?
    if (req.user.ident !== req.body.ident && req.user.access !== 'superUser') {
      logger.error('User is not allowed to edit someone other than self');
      return res.status(403).json({status: false, message: 'You are not allowed to perform this action'});
    }

    // Check Access
    if (req.user.access !== 'superUser') {
      if (req.body.access && req.body.access !== req.user.access) {
        logger.error('User is not able to update own access');
        return res.status(403).json({error: {message: 'You are not able to update your own access', code: 'failUpdateAccess'}});
      }
      if (req.body.username && req.body.username !== req.user.username) {
        logger.error('User is not able to update username');
        return res.status(403).json({error: {message: 'You are not able to update your username', code: 'failUpdateUsername'}});
      }
      if (req.body.type && req.body.type !== req.user.type) {
        logger.error('User is not able to update account type');
        return res.status(403).json({error: {message: 'You are not able to update your account type', code: 'failUpdateType'}});
      }
    }

    if (req.body.password && req.body.password && req.body.password.length < 8) {
      logger.error('Password must be 8 characters or more');
      return res.status(400).json({error: {message: 'Password must be 8 characters or more.', code: 'failUpdateType'}});
    }

    const updateBody = {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      email: req.body.email,
    };

    if (req.body.settings) {
      updateBody.settings = req.body.settings;
    }

    if (req.body.password && req.body.password.length > 7) {
      updateBody.password = bcrypt.hashSync(req.body.password, 10);
    }

    let userUpdate;
    try {
      // Attempt user model update
      userUpdate = await db.models.user.update(updateBody, {
        where: {ident: req.body.ident},
        returning: true,
        limit: 1,
      });
    } catch (error) {
      logger.error(`SQL Error unable to update user model ${error}`);
      return res.status(500).json({error: {message: 'Unable to update user model', code: 'failedUserModelUpdate'}});
    }

    if (typeof userUpdate === 'object') {
      return res.json(userUpdate);
    }

    try {
      const user = await db.models.user.findOne({
        where: {ident: userUpdate[1][0].ident},
        attributes: {exclude: ['id', 'password', 'deletedAt']},
        include: [
          {as: 'groups', model: db.models.userGroup, attributes: {exclude: ['id', 'user_id', 'owner_id', 'deletedAt', 'updatedAt', 'createdAt']}},
          {as: 'projects', model: db.models.project, attributes: {exclude: ['id', 'deletedAt', 'updatedAt', 'createdAt']}},
        ],
      });
      return res.json(user);
    } catch (error) {
      logger.error(`SQL Error unable to find user ${error}`);
      return res.status(500).json({error: {message: 'SQL Error unable to find user', code: 'failedUserSearch'}});
    }
  })
  // Remove a user
  .delete(async (req, res) => {
    // Remove a user
    const access = new Acl(req, res);
    access.write = ['admin', 'superUser'];
    if (!access.check()) {
      logger.error('User isn\'t allowed to remove a user');
      return res.status(403).send();
    }

    try {
      // Destroy User
      const result = await db.models.user.destroy({where: {ident: req.params.ident}, limit: 1});
      if (!result) {
        logger.error('Unable to remove the requested user');
        return res.status(400).json({error: {message: 'Unable to remove the requested user', code: 'failedUserRemove'}});
      }

      return res.status(204).send();
    } catch (error) {
      logger.error(`SQL Failed User remove ${error}`);
      return res.status(500).json({error: {message: 'Unable to remove the requested user', code: 'failedUserRemoveQuery'}});
    }
  });

// User Search
router.route('/search')
  .get(async (req, res) => {
    const {query} = req.query;

    const where = {
      $or: [
        {firstName: {$ilike: `%${query}%`}},
        {lastName: {$ilike: `%${query}%`}},
        {username: {$ilike: `%${query}%`}},
      ],
    };

    try {
      const users = await db.models.user.findAll({where, attributes: {exclude: ['deletedAt', 'id', 'password', 'jiraToken']}});
      return res.json(users);
    } catch (error) {
      logger.error(`SQL Error while trying to find all users ${error}`);
      return res.status(500).json({error: {message: 'Unable to query user search'}});
    }
  });

module.exports = router;
