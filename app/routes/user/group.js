const Ajv = require('ajv');
const express = require('express');
const db = require('../../models');
const Acl = require('../../middleware/acl');
const logger = require('../../log');

const ajv = new Ajv({useDefaults: true, logger});
const router = express.Router({mergeParams: true});

// Group json schema
const groupSchema = {
  type: 'object',
  required: [],
  properties: {
  },
};

// Compile schema to be used in validator
const validateGroup = ajv.compile(groupSchema);

// Validates the request
const parseGroup = (request) => {
  if (!validateGroup(request)) {
  }
  return {
  };
};

// Middleware for all group functions
router.use('/', (req, res, next) => {
  // Access Control
  const access = new Acl(req, res);
  access.read = ['*'];
  if (!access.check()) {
    logger.error('User isn\'t allowed to access this');
    return res.status(403).send();
  }

  return next();
});

// Middleware for group resolution
router.param('group', async (req, res, next, ident) => {
  // Lookup group!
  const opts = {
    where: {ident},
    attributes: {exclude: ['deletedAt']},
    include: [
      {as: 'users', model: db.models.user, attributes: {exclude: ['id', 'deletedAt', 'password', 'access', 'jiraToken']}},
      {as: 'owner', model: db.models.user.scope('public')},
    ],
  };

  try {
    req.group = await db.models.userGroup.findOne(opts);
    return next();
  } catch (error) {
    logger.error(`SQL Group Lookup Error ${error}`);
    return res.status(500).json({error: {message: 'Error while trying to find a usergroup', code: 'failedGroupIdentLookup'}});
  }
});

// Route for getting a Group
router.route('/')
  // Get All Groups
  .get(async (req, res) => {
    const opts = {
      attributes: {exclude: ['id', 'deletedAt']},
      order: [['name', 'ASC']],
      include: [
        {as: 'users', model: db.models.user, attributes: {exclude: ['id', 'deletedAt', 'password', 'access', 'jiraToken']}},
        {as: 'owner', model: db.models.user.scope('public')},
      ],
    };

    try {
      // Get Groups
      const groups = await db.models.userGroup.findAll(opts);
      return res.json(groups);
    } catch (error) {
      logger.error(`SQL Groups Lookup Error ${error}`);
      return res.status(500).json({error: {message: 'Error while trying to get all groups', code: 'failedGroupsLookup'}});
    }
  })
  .post(async (req, res) => {
    const newGroup = {name: req.body.name};
    let user;
    try {
      // Get Owner/User ID resolve
      user = await db.models.user.findOne({where: {ident: req.body.owner}});
    } catch (error) {
      logger.error(`SQL Groups lookup error ${error}`);
      return res.status(500).json({error: {message: 'Unable to get owner/user', code: 'failedOwnerLookup'}});
    }

    if (!user && req.body.user) {
      logger.error('Unable to find the specified owner');
      return res.status(404).json({message: 'Unable to find the specified owner'});
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
      return res.status(500).json({error: {message: 'Unable to create the new group', code: 'failedGroupsCreate'}});
    }

    const opts = {
      where: {ident: userGroup.ident},
      attributes: {exclude: ['id', 'deletedAt']},
      include: [
        {as: 'users', model: db.models.user, attributes: {exclude: ['id', 'deletedAt', 'password', 'access', 'jiraToken']}},
        {as: 'owner', model: db.models.user.scope('public')},
      ],
    };

    try {
      // Get Group with inclusions
      const group = await db.models.userGroup.findOne(opts);
      return res.json(group);
    } catch (error) {
      logger.error(`SQL Groups lookup failure ${error}`);
      return res.status(500).json({error: {message: 'There was an error loading the newly created group', code: 'failedGroupLookup'}});
    }
  });

// Get Group
router.route('/:group([A-z0-9-]{36})')
  .get((req, res) => {
    // Getting Group
    return res.json(req.group);
  })
  .put(async (req, res) => {
    let user;
    try {
      // Get Owner/User ID resolve
      user = await db.models.user.findOne({where: {ident: req.body.owner}});
    } catch (error) {
      logger.error('SQL Error while trying to find owner/user');
      return res.status(500).json({error: {message: 'Unable to find owner/user', code: 'failedGroupUpdateQuery'}});
    }

    if (!user && req.body.user) {
      logger.error('Unable to find the specified owner');
      return res.status(404).json({error: {message: 'Unable to find the specified owner', code: 'failedGroupUpdateQuery'}});
    }

    if (user) {
      req.group.owner_id = user.id;
    }

    // Update Group
    req.group.name = req.body.name;
    try {
      const save = await req.group.save();
      await save.reload();
      return res.json(save);
    } catch (error) {
      logger.error(`SQL Error trying to update group ${error}`);
      return res.status(500).json({error: {message: 'Unable to update the specified group', code: 'failedGroupUpdateQuery'}});
    }
  })

  .delete(async (req, res) => {
    try {
      await db.models.userGroup.destroy({where: {ident: req.group.ident}});
      return res.status(204).send();
    } catch (error) {
      logger.error(`SQL Error trying to remove group ${error}`);
      return res.status(500).json({error: {message: 'Unable to remove group', code: 'failedGroupDestroyQuery'}});
    }
  });

// Membership Functions
router.route('/:group([A-z0-9-]{36})/member')
  .get((req, res) => {
    // Get Group Members
    return res.json(req.group.users);
  })
  .post(async (req, res) => {
    // Add Group Member
    let user;
    try {
      // Lookup User
      user = await db.models.user.findOne({where: {ident: req.body.user}, attributes: {exclude: ['deletedAt', 'access', 'password', 'jiraToken']}});
    } catch (error) {
      logger.error(`SQL Error trying to find user ${error}`);
      return res.status(500).json({error: {message: 'Unable to find user', code: 'failedUserLookupGroupMember'}});
    }

    if (!user) {
      logger.error('Unable to find user');
      return res.status(404).json({error: {message: 'Unable to find user', code: 'failedUserLookupGroupMember'}});
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

      return res.json(output);
    } catch (error) {
      logger.error(`SQL Error trying to add group member ${error}`);
      return res.status(500).json({error: {message: 'Unable to add group member', code: 'failedGroupMemberCreateQuery'}});
    }
  })
  .delete(async (req, res) => {
    // Remove Group Member
    let user;
    try {
      // Lookup User
      user = await db.models.user.findOne({where: {ident: req.body.user}, attributes: {exclude: ['deletedAt', 'access', 'password', 'jiraToken']}});
    } catch (error) {
      logger.error(`SQL Error trying to find user ${error}`);
      return res.status(500).json({error: {message: 'SQL Error unable to find user', code: 'failedUserLookupGroupMember'}});
    }

    if (!user) {
      logger.error('Unable to find user');
      return res.status(404).json({error: {message: 'Unable to find user', code: 'failedUserLookupGroupMember'}});
    }

    try {
      // Remove membership
      const membership = await db.models.userGroupMember.destroy({where: {group_id: req.group.id, user_id: user.id}});
      if (!membership) {
        logger.error('Unable to remove group member');
        return res.status(404).json({error: {message: 'Unable to remove group member', code: 'failedGroupMemberDestroy'}});
      }
      return res.status(204).send();
    } catch (error) {
      logger.error(`SQL Error trying to remove member ${error}`);
      return res.status(500).json({error: {message: 'Unable to remove group member', code: 'failedGroupMemberRemoveQuery'}});
    }
  });

module.exports = router;
