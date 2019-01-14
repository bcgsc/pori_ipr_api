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
  next();
});

// Middleware for group resolution
router.param('group', (req, res, next, ident) => {
  // Lookup group!
  const opts = {
    where: {ident: ident},
    attributes: {exclude: ['deletedAt']},
    include: [
      {as: 'users', model: db.models.user, attributes: {exclude: ['id', 'deletedAt', 'password', 'access', 'jiraToken']}},
      {as: 'owner', model: db.models.user.scope('public')},
    ],
  };
  db.models.userGroup.findOne(opts).then(
    (group) => {
      req.group = group;
      next();
    },
    (err) => {
      console.log('SQL Group Lookup Error', err);
      res.status(404).json({error: {message: 'Unable to find the specified group', code: 'failedGroupIdentLookup'}});
    }
  );
});

// Route for getting a Group
router.route('/')

// Get All Groups
  .get((req, res) => {
    const opts = {
      attributes: {exclude: ['id', 'deletedAt']},
      order: [['name', 'ASC']],
      include: [
        {as: 'users', model: db.models.user, attributes: {exclude: ['id', 'deletedAt', 'password', 'access', 'jiraToken']}},
        {as: 'owner', model: db.models.user.scope('public')},
      ],
    };

    // Get Groups
    db.models.userGroup.findAll(opts).then(
      (groups) => {
        res.json(groups);
      },
      (err) => {
        console.log('SQL Groups Lookup Error', err);
        res.status(404).json({error: {message: 'Unable to find the groups', code: 'failedGroupsLookup'}});
      }
    );
  })
  .post((req, res) => {
    // Get Owner/User ID resolve
    db.models.user.findOne({where: {ident: req.body.owner}}).then(
      (result) => {
        const newGroup = {name: req.body.name};

        if ((result === null || result === undefined) && req.body.user) return res.status(400).json({message: 'Unable to find the specified owner'});
        if (result !== null) newGroup.owner_id = result.id;

        // Add new group
        db.models.userGroup.create(newGroup).then(
          (resp) => {
            const opts = {
              where: {ident: resp.ident},
              attributes: {exclude: ['id', 'deletedAt']},
              include: [
                {as: 'users', model: db.models.user, attributes: {exclude: ['id', 'deletedAt', 'password', 'access', 'jiraToken']}},
                {as: 'owner', model: db.models.user.scope('public')},
              ],
            };

            // Get Group with inclusions
            db.models.userGroup.findOne(opts).then(
              (group) => {
                res.json(group);
              },
              (err) => {
                console.log('SQL Groups lookup failure', err);
                res.status(500).json({error: {message: 'There was an error loading the newly created group.', code: 'failedGroupLookup'}});
              }
            );
          },
          (err) => {
            console.log('SQL Groups Creation Error', err);
            res.status(400).json({error: {message: 'Unable to create the new group', code: 'failedGroupsCreate'}});
          }
        );
      }
    );
  });

// Get Group
router.route('/:group([A-z0-9-]{36})')
  .get((req, res) => {
    // Getting Group
    return res.json(req.group);
  })
  .put((req, res) => {
    // Get Owner/User ID resolve
    db.models.user.findOne({where: {ident: req.body.owner}}).then(
      (result) => {
        if (result === null && req.body.user) return res.status(400).json({message: 'Unable to find the specified owner'});
        if (result !== null) req.group.owner_id = result.id;

        // Update Group
        req.group.name = req.body.name;
        req.group.save().then(
          (resp) => {
            res.json(resp);
          },
          (err) => {
            console.log('Unable to update group', err);
            res.status(400).json({error: {message: 'Unable to update the specified group', code: 'failedGroupUpdateQuery'}});
          }
        );
      },
      (err) => {
        console.log(err);
        return res.status(400).json({message: 'Unable to update the group. Internal server issue.'});
      }
    );
  })

  .delete((req, res) => {
    db.models.userGroup.destroy({where: {ident: req.group.ident}}).then(
      (result) => {
        res.status(204).send();
      },
      (err) => {
        res.status(400).json({error: {message: 'Unable to remove the specified group', code: 'failedGroupDestroyQuery'}});
      }
    );
  });

// Membership Functions
router.route('/:group([A-z0-9-]{36})/member')
  .get((req, res) => {
    // Get Group Members
    res.json(req.group.users);
  })
  .post((req, res) => {
    // Add Group Member

    // Lookup User
    db.models.user.findOne({where: {ident: req.body.user}, attributes: {exclude: ['deletedAt', 'access', 'password', 'jiraToken']}}).then(
      (user) => {
        if (user === null) return res.status(400).json({error: {message: 'Unable to find the supplied user.', code: 'failedUserLookupGroupMember'}});

        // Add membership
        db.models.userGroupMember.create({group_id: req.group.id, user_id: user.id}).then(
          (membership) => {
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

            res.json(output);
          },
          (err) => {
            console.log('Unable to add group member.', err);
            res.status(400).json({error: {message: 'Unable to add group member', code: 'failedGroupMemberCreateQuery'}});
          }
        );
      },
      (err) => {
        console.log('Unable to update group', err);
        res.status(400).json({error: {message: 'Unable to update the specified group', code: 'failedUserLookupGroupMember'}});
      }
    );
  })
  .delete((req, res) => {
    // Remove Group Member

    // Lookup User
    db.models.user.findOne({where: {ident: req.body.user}, attributes: {exclude: ['deletedAt', 'access','password','jiraToken']}}).then(
      (user) => {
        if (user === null) return res.status(400).json({error: {message: 'Unable to find the supplied user.', code: 'failedUserLookupGroupMember'}});

        // Add membership
        db.models.userGroupMember.destroy({where: {group_id: req.group.id, user_id: user.id}}).then(
          (membership) => {
            if (membership === null) return res.status(400).json({error: {message: 'Unable to remove group member', code: 'failedGroupMemberDestroy'}});
            res.status(204).send();
          },
          (err) => {
            console.log('Unable to add remove member.', err);
            res.status(400).json({error: {message: 'Unable to remove group member', code: 'failedGroupMemberRemoveQuery'}});
          }
        );
      },
      (err) => {
        console.log('Unable to update group', err);
        res.status(400).json({error: {message: 'Unable to update the specified group', code: 'failedUserLookupGroupMember'}});
      }
    );
  });

module.exports = router;
