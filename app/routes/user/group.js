const HTTP_STATUS = require('http-status-codes');
const express = require('express');

const db = require('../../models');
const Acl = require('../../middleware/acl');
const logger = require('../../log');

const router = express.Router({mergeParams: true});

const schemaGenerator = require('../../schemas/schemaGenerator');
const validateAgainstSchema = require('../../libs/validateAgainstSchema');
const {BASE_EXCLUDE} = require('../../schemas/exclude');


const groupProperties = {
  owner: {type: 'string', format: 'uuid'},
};

const memberProperties = {
  user: {type: 'string', format: 'uuid'},
};

// Generate schema's
const groupUpdateSchema = schemaGenerator(db.models.userGroup, {
  baseUri: '/update',
  exclude: [...BASE_EXCLUDE, 'owner_id'],
  properties: groupProperties,
  nothingRequired: true,
});

const groupCreateSchema = schemaGenerator(db.models.userGroup, {
  baseUri: '/create',
  exclude: [...BASE_EXCLUDE, 'owner_id'],
  properties: groupProperties,
  required: ['owner'],
});

const memberCreateSchema = schemaGenerator(db.models.userGroupMember, {
  baseUri: '/create',
  exclude: [...BASE_EXCLUDE, 'user_id', 'group_id'],
  properties: memberProperties,
  required: ['user'],
});


// Middleware for all group functions
router.use('/', (req, res, next) => {
  // Access Control
  const access = new Acl(req);
  if (!access.check()) {
    logger.error('User isn\'t allowed to access this');
    return res.status(HTTP_STATUS.FORBIDDEN).send({status: false, message: 'You are not allowed to perform this action'});
  }

  return next();
});

// Middleware for user groups
router.param('group', async (req, res, next, ident) => {
  // Lookup group!
  try {
    req.group = await db.models.userGroup.findOne({
      where: {ident},
      include: [
        {as: 'users', model: db.models.user, attributes: {exclude: ['id', 'deletedAt', 'password', 'jiraToken']}},
        {as: 'owner', model: db.models.user.scope('public')},
      ],
    });
    return next();
  } catch (error) {
    logger.error(`Unable to find group ${error}`);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to find group'}});
  }
});

// Get Group
router.route('/:group([A-z0-9-]{36})')
  .get((req, res) => {
    if (req.group) {
      return res.json(req.group.view('public'));
    }
    return res.json(null);
  })
  .put(async (req, res) => {
    // check if group exists
    if (!req.group) {
      logger.error('No group to update');
      return res.status(HTTP_STATUS.NOT_FOUND).json({error: {message: 'No group to update'}});
    }

    try {
      // Validate input
      validateAgainstSchema(groupUpdateSchema, req.body, false);
    } catch (error) {
      // if input is invalid return 400
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message: error.message}});
    }

    if (req.body.owner) {
      let user;
      try {
        // Get Owner/User ID resolve
        user = await db.models.user.findOne({where: {ident: req.body.owner}});
      } catch (error) {
        logger.error('SQL Error while trying to find owner/user');
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to find owner/user'}});
      }
  
      if (!user) {
        logger.error('Unable to find the specified owner');
        return res.status(HTTP_STATUS.NOT_FOUND).json({error: {message: 'Unable to find the specified owner'}});
      }
  
      req.body.owner_id = user.id;
    }

    // Update Group
    try {
      await req.group.update(req.body);
      await req.group.reload();
      return res.json(req.group.view('public'));
    } catch (error) {
      logger.error(`Unable to update group ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to update group'}});
    }
  })

  .delete(async (req, res) => {
    // check if group exists
    if (!req.group) {
      logger.error('No group to delete');
      return res.status(HTTP_STATUS.NOT_FOUND).json({error: {message: 'No group to delete'}});
    }

    try {
      await req.group.destroy();
      return res.status(HTTP_STATUS.NO_CONTENT).send();
    } catch (error) {
      logger.error(`SQL Error trying to remove group ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to remove group'}});
    }
  });

// Membership Functions
router.route('/:group([A-z0-9-]{36})/member')
  .get((req, res) => {
    if (req.group) {
      return res.json(req.group.users);
    }
    return res.json(null);
  })
  .post(async (req, res) => {
    // check if group exists
    if (!req.group) {
      logger.error('No group to add member to');
      return res.status(HTTP_STATUS.NOT_FOUND).json({error: {message: 'No group to add member to'}});
    }
    // Add Group Member
    try {
      // Validate input
      validateAgainstSchema(memberCreateSchema, req.body);
    } catch (error) {
      // if input is invalid return 400
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message: error.message}});
    }

    let user;
    try {
      // Lookup User
      user = await db.models.user.findOne({where: {ident: req.body.user}, attributes: {exclude: ['deletedAt', 'password', 'jiraToken']}});
    } catch (error) {
      logger.error(`SQL Error trying to find user ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to find user'}});
    }

    if (!user) {
      logger.error('Unable to find user');
      return res.status(HTTP_STATUS.NOT_FOUND).json({error: {message: 'Unable to find user'}});
    }

    try {
      // Add membership
      const membership = await db.models.userGroupMember.create({group_id: req.group.id, user_id: user.id});
      const output = {
        ident: user.ident,
        username: user.username,
        type: user.type,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        userGroupMember: {
          updatedAt: membership.updatedAt,
          createdAt: membership.createdAt,
        },
      };

      return res.status(HTTP_STATUS.CREATED).json(output);
    } catch (error) {
      logger.error(`SQL Error trying to add group member ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to add group member'}});
    }
  })
  .delete(async (req, res) => {
    // check if group exists
    if (!req.group) {
      logger.error('Group doesn\'t exist to remove member from');
      return res.status(HTTP_STATUS.NOT_FOUND).json({error: {message: 'Group doesn\'t exist to remove member from'}});
    }
    // Remove Group Member
    try {
      // Validate input
      validateAgainstSchema(memberCreateSchema, req.body);
    } catch (error) {
      // if input is invalid return 400
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message: error.message}});
    }

    let user;
    try {
      // Lookup User
      user = await db.models.user.findOne({where: {ident: req.body.user}, attributes: {exclude: ['deletedAt', 'password', 'jiraToken']}});
    } catch (error) {
      logger.error(`SQL Error trying to find user ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'SQL Error unable to find user'}});
    }

    if (!user) {
      logger.error('Unable to find user');
      return res.status(HTTP_STATUS.NOT_FOUND).json({error: {message: 'Unable to find user'}});
    }

    try {
      // Remove membership
      const membership = await db.models.userGroupMember.destroy({where: {group_id: req.group.id, user_id: user.id}});
      if (!membership) {
        logger.error('Unable to remove group member');
        return res.status(HTTP_STATUS.NOT_FOUND).json({error: {message: 'Unable to remove group member'}});
      }
      return res.status(HTTP_STATUS.NO_CONTENT).send();
    } catch (error) {
      logger.error(`SQL Error trying to remove member ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to remove group member'}});
    }
  });

// Route for getting a Group
router.route('/')
  // Get All Groups
  .get(async (req, res) => {
    // Get Groups
    try {
      const groups = await db.models.userGroup.scope('public').findAll();
      return res.json(groups);
    } catch (error) {
      logger.error(`SQL Groups Lookup Error ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Error while trying to get all groups'}});
    }
  })
  .post(async (req, res) => {
    try {
      // Validate input
      validateAgainstSchema(groupCreateSchema, req.body);
    } catch (error) {
      // if input is invalid return 400
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message: error.message}});
    }

    const newGroup = {name: req.body.name};
    let user;
    try {
      // Get Owner/User ID resolve
      user = await db.models.user.findOne({where: {ident: req.body.owner}});
    } catch (error) {
      logger.error(`SQL Groups lookup error ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to get owner/user'}});
    }

    if (!user && req.body.user) {
      logger.error('Unable to find the specified owner');
      return res.status(HTTP_STATUS.NOT_FOUND).json({message: 'Unable to find the specified owner'});
    }
    if (user) {
      newGroup.owner_id = user.id;
    }

    let userGroup;
    try {
      // Add new group
      userGroup = await db.models.userGroup.create(newGroup);
    } catch (error) {
      logger.error(`SQL Groups Creation Error ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to create the new group'}});
    }

    // Get Group with inclusions
    try {
      const group = await db.models.userGroup.scope('public').findOne({
        where: {ident: userGroup.ident},
      });
      return res.status(HTTP_STATUS.CREATED).json(group);
    } catch (error) {
      logger.error(`SQL Groups lookup failure ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'There was an error loading the newly created group'}});
    }
  });

module.exports = router;
