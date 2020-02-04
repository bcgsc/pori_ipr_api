const HTTP_STATUS = require('http-status-codes');
const Ajv = require('ajv');
const express = require('express');
const bcrypt = require('bcryptjs');
const {Op} = require('sequelize');
const db = require('../../models');
const Acl = require('../../middleware/acl');
const logger = require('../../log');

const router = express.Router({mergeParams: true});
const ajv = new Ajv({useDefaults: true, logger});

// POST new user json schema
const newUserSchema = {
  type: 'object',
  required: ['username', 'type', 'firstName', 'lastName', 'email'],
  properties: {
    username: {type: 'string', minLength: 2},
    password: {type: 'string'},
    // type must be either 'local' or 'bcgsc'
    type: {type: 'string', enum: db.models.user.rawAttributes.type.values},
    email: {type: 'string', format: 'email'},
    firstName: {type: 'string', minLength: 1},
    lastName: {type: 'string', minLength: 1},
  },
  // password can be null if type is bcgsc
  if: {
    properties: {type: {const: 'bcgsc'}},
  },
  then: {
    properties: {password: {default: null}},
  },
  else: {
    // password need to have minimum length of 8
    required: ['username', 'password', 'type', 'firstName', 'lastName', 'email'],
    properties: {password: {minLength: 8}},
  },
};

// Compile schema to be used in validator
const validate = ajv.compile(newUserSchema);

// Validates the request
const parseNewUser = (request) => {
  if (!validate(request)) {
    if (validate.errors[0].dataPath) {
      throw new Error(`${validate.errors[0].dataPath} ${validate.errors[0].message}`);
    } else {
      throw new Error(`New Users ${validate.errors[0].message}`);
    }
  }
  return {
    username: request.username,
    password: request.password,
    type: request.type,
    email: request.email,
    firstName: request.firstName,
    lastName: request.lastName,
    access: 'clinician',
  };
};

// Route for getting a POG
router.route('/')
  // Get All Users
  .get(async (req, res) => {
    // Access Control
    const access = new Acl(req, res);
    access.read = ['admin'];
    if (!access.check()) {
      logger.error('User isn\'t allowed to access this');
      return res.status(HTTP_STATUS.FORBIDDEN).send();
    }

    try {
      // Get users
      const users = await db.models.user.findAll({
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
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to get current user', code: 'failedCurrentUserLookup'}});
    }
  })
  .post(async (req, res) => {
    // Add new user

    // Checks if the person is authorized to add new users
    const access = new Acl(req, res);
    if (!access.check()) {
      logger.error('User isn\'t allowed to add a new user');
      return res.status(HTTP_STATUS.FORBIDDEN).send({error: {message: 'You are not allowed to perform this action'}});
    }

    try {
      // Validate input
      req.body = parseNewUser(req.body);
    } catch (error) {
      // if input is invalid return 400
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message: error.message}});
    }

    let deletedUserExists;
    let userExists;
    try {
      // Check for existing account.
      deletedUserExists = await db.models.user.findOne({where: {username: req.body.username, deletedAt: {[Op.ne]: null}}, paranoid: false});
      userExists = await db.models.user.findOne({where: {username: req.body.username}});
    } catch (error) {
      logger.error(`SQL Error unable to check for existing username ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to check if this username has been taken', code: 'failedUserNameExistsQuery'}});
    }

    // if username exists and is not a deleted user return 409
    if (userExists) {
      return res.status(HTTP_STATUS.CONFLICT).json({error: {message: 'Username already exists'}});
    }

    if (deletedUserExists) {
      // set up user to restore with updated field values
      const restoreUser = req.body;
      restoreUser.deletedAt = null;

      try {
        const result = await db.models.user.update(restoreUser, {
          where: {ident: deletedUserExists.ident},
          individualHooks: true,
          paranoid: true,
          returning: true,
        });

        // Get updated model data from update
        const [, [{dataValues}]] = result;

        // Remove id's and deletedAt properties from returned model
        const {
          id, password, deletedAt, ...publicModel
        } = dataValues;

        return res.json(publicModel);
      } catch (error) {
        logger.error(`Unable to restore username ${error}`);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to restore existing username', code: 'failedUsernameCheckQuery'}});
      }
    }

    // Hash password
    if (req.body.type === 'local') {
      req.body.password = bcrypt.hashSync(req.body.password, 10);
    }

    try {
      // Everything looks good, create the account!
      const resp = await db.models.user.create(req.body);
      // Account created, send details
      return res.json(resp);
    } catch (error) {
      logger.error(`Unable to create user account ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({status: false, message: 'Unable to create user account.'});
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
      const result = await db.models.user.update(req.body, {
        where: {ident: req.user.ident},
        individualHooks: true,
        paranoid: true,
        returning: true,
      });

      // Get updated model data from update
      const [, [{dataValues}]] = result;

      return res.json(dataValues.settings);
    } catch (error) {
      logger.error(`SQL Error unable to update user ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to update user', code: 'failedUserUpdate'}});
    }
  });

router.route('/:ident([A-z0-9-]{36})')
  .put(async (req, res) => {
    // Update current user
    // Access Control
    const access = new Acl(req, res);
    access.write = ['*']; // Admins can update any user, users can only update themselves
    access.read = ['*']; // Any user should be able to read itself after updating its info

    // Is the user neither itself or admin?
    if (!(req.user.ident === req.params.ident || req.user.get('groups').filter((user) => { return user.name === 'admin'; }).length > 0)) {
      logger.error('User is not allowed to edit someone other than self');
      return res.status(HTTP_STATUS.FORBIDDEN).json({status: false, message: 'You are not allowed to perform this action'});
    }

    // Check Access
    if (!(req.user.get('groups').filter((user) => { return user.name === 'admin'; }).length > 0)) {
      if (req.body.access && req.body.access !== req.user.access) {
        logger.error('User is not able to update own access');
        return res.status(HTTP_STATUS.FORBIDDEN).json({error: {message: 'You are not able to update your own access', code: 'failUpdateAccess'}});
      }
      if (req.body.username && req.body.username !== req.user.username) {
        logger.error('User is not able to update username');
        return res.status(HTTP_STATUS.FORBIDDEN).json({error: {message: 'You are not able to update your username', code: 'failUpdateUsername'}});
      }
      if (req.body.type && req.body.type !== req.user.type) {
        logger.error('User is not able to update account type');
        return res.status(HTTP_STATUS.FORBIDDEN).json({error: {message: 'You are not able to update your account type', code: 'failUpdateType'}});
      }
    }

    if (req.body.password && req.body.password && req.body.password.length < 8) {
      logger.error('Password must be 8 characters or more');
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message: 'Password must be 8 characters or more.', code: 'failUpdateType'}});
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

    // Attempt user model update
    try {
      await db.models.user.update(updateBody, {
        where: {ident: req.params.ident},
        individualHooks: true,
        paranoid: true,
        limit: 1,
      });
    } catch (error) {
      logger.error(`SQL Error unable to update user model ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to update user model', code: 'failedUserModelUpdate'}});
    }

    try {
      const user = await db.models.user.findOne({
        where: {ident: req.params.ident},
        attributes: {exclude: ['id', 'password', 'deletedAt']},
        include: [
          {as: 'groups', model: db.models.userGroup, attributes: {exclude: ['id', 'user_id', 'owner_id', 'deletedAt', 'updatedAt', 'createdAt']}},
          {as: 'projects', model: db.models.project, attributes: {exclude: ['id', 'deletedAt', 'updatedAt', 'createdAt']}},
        ],
      });
      return res.json(user);
    } catch (error) {
      logger.error(`SQL Error unable to find user ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'SQL Error unable to find user', code: 'failedUserSearch'}});
    }
  })
  // Remove a user
  .delete(async (req, res) => {
    // Remove a user
    const access = new Acl(req, res);
    access.write = ['admin'];
    if (!access.check()) {
      logger.error('User isn\'t allowed to remove a user');
      return res.status(HTTP_STATUS.FORBIDDEN).send({status: false, message: 'You are not allowed to perform this action'});
    }

    try {
      // Destroy User
      const result = await db.models.user.destroy({where: {ident: req.params.ident}, limit: 1});
      if (!result) {
        logger.error('Unable to remove the requested user');
        return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message: 'Unable to remove the requested user', code: 'failedUserRemove'}});
      }

      return res.status(HTTP_STATUS.NO_CONTENT).send();
    } catch (error) {
      logger.error(`SQL Failed User remove ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to remove the requested user', code: 'failedUserRemoveQuery'}});
    }
  });

// User Search
router.route('/search')
  .get(async (req, res) => {
    const {query} = req.query;

    const where = {
      [Op.or]: [
        {firstName: {[Op.iLike]: `%${query}%`}},
        {lastName: {[Op.iLike]: `%${query}%`}},
        {username: {[Op.iLike]: `%${query}%`}},
      ],
    };

    try {
      const users = await db.models.user.findAll({where, attributes: {exclude: ['deletedAt', 'id', 'password', 'jiraToken']}});
      return res.json(users);
    } catch (error) {
      logger.error(`SQL Error while trying to find all users ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to query user search'}});
    }
  });

module.exports = router;
