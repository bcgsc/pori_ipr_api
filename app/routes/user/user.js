const HTTP_STATUS = require('http-status-codes');
const express = require('express');
const bcrypt = require('bcryptjs');
const {Op} = require('sequelize');
const db = require('../../models');
const logger = require('../../log');
const {isAdmin, isManager} = require('../../libs/helperFunctions');

const validateAgainstSchema = require('../../libs/validateAgainstSchema');
const {createSchema, updateSchema, notificationUpdateSchema} = require('../../schemas/user');

const router = express.Router({mergeParams: true});

// Middleware for getting/updating a user by ident
router.param('userByIdent', async (req, res, next, ident) => {
  let result;
  try {
    result = await db.models.user.findOne({
      where: {ident},
      include: [
        {
          model: db.models.userGroup,
          as: 'groups',
          attributes: {
            exclude: ['id', 'deletedAt', 'updatedAt', 'createdAt', 'updatedBy', 'userId'],
          },
        },
        {
          model: db.models.project,
          as: 'projects',
          attributes: {
            exclude: ['id', 'deletedAt', 'updatedAt', 'createdAt', 'updatedBy'],
          },
          through: {attributes: []},
        },
        {
          model: db.models.userMetadata,
          as: 'metadata',
          attributes: {
            exclude: ['id', 'deletedAt', 'updatedAt', 'createdAt', 'updatedBy', 'userId'],
          },
        },
      ],
    });
  } catch (error) {
    logger.error(`Error while trying to find user by ident ${error}`);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: {message: 'Error while trying to find user by ident'},
    });
  }

  if (!result) {
    logger.error(`Unable to find user with ident: ${ident}`);
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      error: {message: 'Unable to find user with'},
    });
  }

  // Add user to request
  req.userByIdent = result;
  return next();
});

// Routes for operating on a notifications of a single user
router.route('/:userByIdent([A-z0-9-]{36})/notifications')
  .put(async (req, res) => {
    try {
      // Validate input
      validateAgainstSchema(notificationUpdateSchema, req.body, false);
    } catch (error) {
      const message = `There was an error validating the user notification update request ${error}`;
      logger.error(message);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message}});
    }

    try {
      await req.userByIdent.update(req.body, {userId: req.user.id});
      await req.userByIdent.reload();
      return res.json(req.userByIdent.view('public'));
    } catch (error) {
      logger.error(`Error while trying to update user notifications ${req.userByIdent.username} ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Error while trying to update user notifications'},
      });
    }
  });

// Routes for operating on a single user
router.route('/:userByIdent([A-z0-9-]{36})')
  .get((req, res) => {
    if (!isAdmin(req.user) && !isManager(req.user) && req.user.id !== req.userByIdent.id) {
      logger.error(`User: ${req.user.username} is not allowed to view this user`);
      return res.status(HTTP_STATUS.FORBIDDEN).send({
        error: {message: 'You are not allowed to perform this action'},
      });
    }
    return res.json(req.userByIdent.view('public'));
  })
  .put(async (req, res) => {
    const subjectUserIsAdmin = await db.models.userGroup.findOne({
      where: {group: 'admin', userId: req.userByIdent.id},
    });

    if (!isAdmin(req.user) && subjectUserIsAdmin) {
      const msg = 'User who is not admin may not edit admin user';
      logger.error(msg);
      return res.status(HTTP_STATUS.FORBIDDEN).json({error: {message: msg}});
    }

    const manager = isManager(req.user);

    if (!manager && req.user.id !== req.userByIdent.id) {
      logger.error(`User: ${req.user.username} is not allowed to edit another user`);
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        error: {message: 'You are not allowed to perform this action'},
      });
    }

    // Check that user isn't editing columns dfss
    if (!manager) {
      if (req.body.username) {
        logger.error(`User: ${req.user.username} is not allowed to update their username`);
        return res.status(HTTP_STATUS.FORBIDDEN).json({
          error: {message: 'You are not allowed to update your username'},
        });
      }
      if (req.body.type) {
        logger.error(`User: ${req.user.username} is not allowed to update their account type`);
        return res.status(HTTP_STATUS.FORBIDDEN).json({
          error: {message: 'You are not allowerd to update your account type'},
        });
      }
    }

    try {
      // Validate input
      validateAgainstSchema(updateSchema, req.body, false);
    } catch (error) {
      const message = `There was an error validating the user update request ${error}`;
      logger.error(message);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message}});
    }

    if (req.body.password) {
      req.body.password = bcrypt.hashSync(req.body.password, 10);
    }

    try {
      await req.userByIdent.update(req.body, {userId: req.user.id});
      await req.userByIdent.reload();
      return res.json(req.userByIdent.view('public'));
    } catch (error) {
      logger.error(`Error while trying to update user ${req.userByIdent.username} ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Error while trying to update user'},
      });
    }
  })
  .delete(async (req, res) => {
    const subjectUserIsAdmin = await db.models.userGroupMember.findOne({
      where: {group: 'admin', userId: req.userByIdent.id},
    });

    if (!isAdmin(req.user) && subjectUserIsAdmin) {
      const msg = 'User who is not admin may not delete admin user';
      logger.error(msg);
      return res.status(HTTP_STATUS.FORBIDDEN).json({error: {message: msg}});
    }

    try {
      await req.userByIdent.destroy();
      return res.status(HTTP_STATUS.NO_CONTENT).send();
    } catch (error) {
      logger.error(`Error while trying to delete user ${req.userByIdent.username} ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Error while trying to delete user'},
      });
    }
  });

// Routes for operating on all users
router.route('/')
  // Get All Users
  .get(async (req, res) => {
    try {
      const users = await db.models.user.scope('public').findAll({
        order: [['username', 'ASC']],
        include: [
          {
            as: 'groups',
            model: db.models.userGroup,
            attributes: {exclude: ['id', 'user_id', 'deletedAt', 'updatedAt', 'createdAt', 'updatedBy']},
            through: {attributes: []},
          },
          {
            as: 'projects',
            model: db.models.project,
            attributes: {exclude: ['id', 'deletedAt', 'updatedAt', 'createdAt', 'updatedBy']},
            through: {attributes: []},
          },
        ],
      });

      return res.json(users);
    } catch (error) {
      logger.error(`Error while trying to get all users ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Error while trying to get all users'},
      });
    }
  })
  .post(async (req, res) => {
    try {
      // Validate input
      validateAgainstSchema(createSchema, req.body);
    } catch (error) {
      const message = `There was an error validating the user create request ${error}`;
      logger.error(message);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message}});
    }

    let userExists;
    try {
      // Check for existing account or if username is taken
      userExists = await db.models.user.findOne({
        where: {username: req.body.username},
        attributes: ['id', 'ident'],
      });
    } catch (error) {
      logger.error(`Error while trying to search for username ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Error while trying to search for username'},
      });
    }

    // if username exists return 409
    if (userExists) {
      logger.error(`Username: ${req.body.username} is already taken`);
      return res.status(HTTP_STATUS.CONFLICT).json({
        error: {message: 'Username is already taken'},
      });
    }

    // If local user hash password
    if (req.body.type === 'local') {
      req.body.password = bcrypt.hashSync(req.body.password, 10);
    } else {
      req.body.password = null;
    }

    let transaction;
    try {
      // Create transaction
      transaction = await db.transaction();
      // Create user
      const createdUser = await db.models.user.create(req.body, {transaction});
      // Create user metadata
      await db.models.userMetadata.create({userId: createdUser.id}, {transaction});
      // Commit changes
      await transaction.commit();
      // Return new user
      return res.status(HTTP_STATUS.CREATED).json(createdUser.view('public'));
    } catch (error) {
      await transaction.rollback();
      logger.error(`Error while trying to create new user ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Error while trying to create new user'},
      });
    }
  });

router.route('/me')
  .get((req, res) => {
    return res.json(req.user.view('public'));
  });

// User Search
router.route('/search')
  .get(async (req, res) => {
    const {query} = req.query;

    try {
      const users = await db.models.user.scope('public').findAll({
        where: {
          [Op.or]: [
            {firstName: {[Op.iLike]: `%${query}%`}},
            {lastName: {[Op.iLike]: `%${query}%`}},
            {username: {[Op.iLike]: `%${query}%`}},
          ],
        },
      });
      return res.json(users);
    } catch (error) {
      logger.error(`Error while trying to search users ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Error while trying to search users'},
      });
    }
  });

module.exports = router;
