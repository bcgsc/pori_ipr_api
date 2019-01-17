'use strict';

// app/routes/genomic/detailedGenomicAnalysis.js
const express = require('express');

const router = express.Router({mergeParams: true});
const Acl = require(`${process.cwd()}/app/middleware/acl`);
const db = require(`${process.cwd()}/app/models`);


// Middleware for all group functions
router.use('/', (req, res, next) => {
  // Access Control
  const access = new Acl(req, res);
  access.read('*');
  if (access.check() === false) return res.status(403).send();

  // All good!
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
    const group = await db.models.userGroup.findOne(opts);
    req.group = group;
    next();
  } catch (error) {
    console.log('SQL Group Lookup Error', error);
    res.status(404).json({error: {message: 'Unable to find the specified group', code: 'failedGroupIdentLookup'}});
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
      res.json(groups);
    } catch (error) {
      console.log('SQL Groups Lookup Error', error);
      res.status(404).json({error: {message: 'Unable to find the groups', code: 'failedGroupsLookup'}});
    }
  })
  .post(async (req, res) => {
    try {
      const newGroup = {name: req.body.name};
      // Get Owner/User ID resolve
      const result = await db.models.user.findOne({where: {ident: req.body.owner}});
      if ((result === null || result === undefined) && req.body.user) return res.status(400).json({message: 'Unable to find the specified owner'});
      if (result !== null) newGroup.owner_id = result.id;

      // Add new group
      const resp = await db.models.userGroup.create(newGroup);
      const opts = {
        where: {ident: resp.ident},
        attributes: {exclude: ['id', 'deletedAt']},
        include: [
          {as: 'users', model: db.models.user, attributes: {exclude: ['id', 'deletedAt', 'password', 'access', 'jiraToken']}},
          {as: 'owner', model: db.models.user.scope('public')},
        ],
      };

      // Get Group with inclusions
      const group = await db.models.userGroup.findOne(opts);
      return res.json(group);
    } catch (error) {
      console.log('SQL Groups lookup failure', error);
      return res.status(500).json({error: {message: error.message, code: error.code}});
    }
  });

// Get Group
router.route('/:group([A-z0-9-]{36})')
  .get((req, res) => {
    // Getting Group
    return res.json(req.group);
  })
  .put(async (req, res) => {
    try {
      // Get Owner/User ID resolve
      const result = await db.models.user.findOne({where: {ident: req.body.owner}});
      if (result === null && req.body.user) return res.status(400).json({message: 'Unable to find the specified owner'});
      if (result !== null) req.group.owner_id = result.id;

      // Update Group
      req.group.name = req.body.name;
      const resp = await req.group.save();
      return res.json(resp);
    } catch (error) {
      console.log(error);
      return res.status(400).json({message: error.message});
    }
  })

  .delete(async (req, res) => {
    try {
      await db.models.userGroup.destroy({where: {ident: req.group.ident}});
      res.status(204).send();
    } catch (error) {
      res.status(400).json({error: {message: 'Unable to remove the specified group', code: 'failedGroupDestroyQuery'}});
    }
  });

// Membership Functions
router.route('/:group([A-z0-9-]{36})/member')
  .get((req, res) => {
    // Get Group Members
    res.json(req.group.users);
  })
  .post(async (req, res) => {
    // Add Group Member

    try {
      // Lookup User
      const user = await db.models.user.findOne({where: {ident: req.body.user}, attributes: {exclude: ['deletedAt', 'access', 'password', 'jiraToken']}});
      if (user === null) return res.status(400).json({error: {message: 'Unable to find the supplied user.', code: 'failedUserLookupGroupMember'}});

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
      console.log(error);
      return res.status(400).json({error: {message: error.message, code: error.code}});
    }
  })
  .delete(async (req, res) => {
    // Remove Group Member

    try {
      // Lookup User
      const user = await db.models.user.findOne({where: {ident: req.body.user}, attributes: {exclude: ['deletedAt', 'access', 'password', 'jiraToken']}});
      if (user === null) return res.status(400).json({error: {message: 'Unable to find the supplied user.', code: 'failedUserLookupGroupMember'}});

      // Add membership
      const membership = await db.models.userGroupMember.destroy({where: {group_id: req.group.id, user_id: user.id}});
      if (membership === null) return res.status(400).json({error: {message: 'Unable to remove group member', code: 'failedGroupMemberDestroy'}});
      return res.status(204).send();
    } catch (error) {
      console.log(error);
      return res.status(400).json({error: {message: error.message, code: error.code}});
    }
  });

module.exports = router;
