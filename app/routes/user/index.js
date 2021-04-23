const HTTP_STATUS = require('http-status-codes');
const express = require('express');
const bcrypt = require('bcryptjs');
const {Op} = require('sequelize');
const db = require('../../models');
const Acl = require('../../middleware/acl');
const logger = require('../../log');
const validateAgainstSchema = require('../../libs/validateAgainstSchema');

const router = express.Router({mergeParams: true});

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

// Route for getting a POG
router.route('/')
  // Get All Users
  .get(async (req, res) => {
    // Access Control
    const access = new Acl(req);
    access.read = ['admin'];
    if (!access.check()) {
      logger.error('User isn\'t allowed to access this');
      return res.status(HTTP_STATUS.FORBIDDEN).send();
    }

    try {
      // Get users
      const users = await db.models.user.scope('public').findAll({
        order: [['username', 'ASC']],
        include: [
          {as: 'groups', model: db.models.userGroup, attributes: {exclude: ['id', 'user_id', 'owner_id', 'deletedAt', 'updatedAt', 'createdAt']}},
          {as: 'projects', model: db.models.project, attributes: {exclude: ['id', 'deletedAt', 'updatedAt', 'createdAt']}},
        ],
      });
      return res.json(users);
    } catch (error) {
      logger.error(`SQL Error unable to get current user ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to get current user'}});
    }
  })
  .post(async (req, res) => {
    // Add new user

    // Checks if the person is authorized to add new users
    const access = new Acl(req);
    if (!access.check()) {
      logger.error('User isn\'t allowed to add a new user');
      return res.status(HTTP_STATUS.FORBIDDEN).send({error: {message: 'You are not allowed to perform this action'}});
    }

    try {
      // Validate input
      validateAgainstSchema(newUserSchema, req.body);
    } catch (error) {
      // if input is invalid return 400
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message: error.message}});
    }

    let userExists;
    try {
      // Check for existing account.
      userExists = await db.models.user.findOne({where: {username: req.body.username}});
    } catch (error) {
      logger.error(`SQL Error unable to check for existing username ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to check if this username has been taken'}});
    }

    // if username exists return 409
    if (userExists) {
      logger.error('Username already exists');
      return res.status(HTTP_STATUS.CONFLICT).json({error: {message: 'Username already exists'}});
    }

    // Hash password
    if (req.body.type === 'local') {
      req.body.password = bcrypt.hashSync(req.body.password, 10);
    }

    let transaction;
    try {
      // Create transaction
      transaction = await db.transaction();
      // Create user
      const resp = await db.models.user.create(req.body, {transaction});
      // Create user metadata
      await db.models.userMetadata.create({userId: resp.id}, {transaction});
      // Commit changes
      await transaction.commit();
      // Return new user
      return res.status(HTTP_STATUS.CREATED).json(resp.view('public'));
    } catch (error) {
      await transaction.rollback();
      logger.error(`Unable to create user account ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({status: false, message: 'Unable to create user account.'});
    }
  });

router.route('/me')
  .get((req, res) => {
    return res.json(req.user.view('public'));
  });

router.route('/settings')
  .get(async (req, res) => {
    try {
      const settings = await db.models.userMetadata.findOne({
        where: {user_id: req.user.id}, attributes: ['settings'],
      });
      return res.json(settings);
    } catch (error) {
      logger.error(`Unable to find user settings for ${req.user.username} ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Unable to find user settings'},
      });
    }
  })
  .put(async (req, res) => {
    try {
      await db.models.userMetadata.update({settings: req.body}, {
        where: {
          user_id: req.user.id,
        },
        fields: ['settings'],
        hooks: false,
        limit: 1,
      });
      return res.json(req.body);
    } catch (error) {
      logger.error(`Unable to update user settings ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to update user settings'}});
    }
  });

router.route('/:ident([A-z0-9-]{36})')
  .put(async (req, res) => {
    // Update current user
    // Access Control
    const access = new Acl(req);
    access.write = ['*']; // Admins can update any user, users can only update themselves

    // Is the user neither itself or admin?
    if (!(req.user.ident === req.params.ident || access.isAdmin())) {
      logger.error('User is not allowed to edit someone other than self');
      return res.status(HTTP_STATUS.FORBIDDEN).json({status: false, message: 'You are not allowed to perform this action'});
    }

    // Check Access
    if (!(access.isAdmin())) {
      if (req.body.username && req.body.username !== req.user.username) {
        logger.error('User is not able to update username');
        return res.status(HTTP_STATUS.FORBIDDEN).json({error: {message: 'You are not able to update your username'}});
      }
      if (req.body.type && req.body.type !== req.user.type) {
        logger.error('User is not able to update account type');
        return res.status(HTTP_STATUS.FORBIDDEN).json({error: {message: 'You are not able to update your account type'}});
      }
    }

    if (req.body.password && req.body.password && req.body.password.length < 8) {
      logger.error('Password must be 8 characters or more');
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message: 'Password must be 8 characters or more.'}});
    }

    const updateBody = {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      email: req.body.email,
    };

    if (req.body.password && req.body.password.length > 7) {
      updateBody.password = bcrypt.hashSync(req.body.password, 10);
    }

    let user;
    try {
      user = await db.models.user.findOne({
        where: {ident: req.params.ident},
        include: [
          {as: 'groups', model: db.models.userGroup, attributes: {exclude: ['id', 'user_id', 'owner_id', 'deletedAt', 'updatedAt', 'createdAt']}},
          {as: 'projects', model: db.models.project, attributes: {exclude: ['id', 'deletedAt', 'updatedAt', 'createdAt']}},
        ],
      });
    } catch (error) {
      logger.error(`SQL Error while trying to find user to update ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'SQL Error while trying to find user to update'}});
    }

    if (!user) {
      logger.error('Unable to find user to update');
      return res.status(HTTP_STATUS.NOT_FOUND).json({error: {message: 'Unable to find user to update'}});
    }

    // Attempt user model update
    try {
      await user.update({...updateBody, ident: req.params.ident});
      await user.reload();
      return res.json(user.view('public'));
    } catch (error) {
      logger.error(`SQL Error unable to update user model ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to update user model'}});
    }
  })
  // Remove a user
  .delete(async (req, res) => {
    const access = new Acl(req);
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
        return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message: 'Unable to remove the requested user'}});
      }

      return res.status(HTTP_STATUS.NO_CONTENT).send();
    } catch (error) {
      logger.error(`SQL Failed User remove ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to remove the requested user'}});
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
      const users = await db.models.user.findAll({where, attributes: {exclude: ['deletedAt', 'id', 'password']}});
      return res.json(users);
    } catch (error) {
      logger.error(`SQL Error while trying to find all users ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to query user search'}});
    }
  });

module.exports = router;
