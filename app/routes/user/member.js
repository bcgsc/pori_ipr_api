const HTTP_STATUS = require('http-status-codes');
const express = require('express');

const db = require('../../models');
const logger = require('../../log');

const router = express.Router({mergeParams: true});
const {isAdmin} = require('../../libs/helperFunctions');
const schemaGenerator = require('../../schemas/schemaGenerator');
const validateAgainstSchema = require('../../libs/validateAgainstSchema');
const {BASE_EXCLUDE} = require('../../schemas/exclude');
const {grantRealmAdmin, ungrantRealmAdmin} = require('../../api/keycloak');


// Generate schema
const memberSchema = schemaGenerator(db.models.userGroupMember, {
  baseUri: '/create-delete',
  exclude: [...BASE_EXCLUDE, 'user_id', 'group_id'],
  properties: {
    user: {type: 'string', format: 'uuid'},
  },
  required: ['user'],
});

router.route('/')
  .get((req, res) => {
    return res.json(req.group.users);
  })
  .post(async (req, res) => {
    try {
      // Validate input
      validateAgainstSchema(memberSchema, req.body);
    } catch (error) {
      const message = `There was an error validating the group member create request ${error}`;
      logger.error(message);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message}});
    }
    const reqUserIsAdmin = isAdmin(req.user);
    let user;
    try {
      // Lookup User
      user = await db.models.user.findOne({
        where: {ident: req.body.user},
        attributes: {exclude: ['deletedAt', 'password', 'updatedBy']},
        include: [
          {
            model: db.models.userGroup,
            as: 'groups',
            attributes: {
              exclude: ['id', 'owner_id', 'deletedAt', 'updatedAt', 'createdAt', 'updatedBy'],
            },
            through: {attributes: []},
          },
        ],
      });
    } catch (error) {
      logger.error(`Error while trying to find group member user ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Error while trying to find group member user'},
      });
    }

    if (!user) {
      logger.error('User doesn\'t exist');
      return res.status(HTTP_STATUS.NOT_FOUND).json({error: {message: 'User doesn\'t exist'}});
    }

    const subjectUserIsAdmin = isAdmin(user);
    const groupIsAdmin = req.group.name === 'admin';

    // TODO: add tests for these checks
    if (!reqUserIsAdmin && groupIsAdmin) {
      const msg = 'Non-admin user can not add user to admin group';
      logger.error(msg);
      return res.status(HTTP_STATUS.FORBIDDEN).json({error: {message: msg}});
    }

    if (!reqUserIsAdmin && subjectUserIsAdmin) {
      const msg = 'Non-admin user can not edit user groups of admin users';
      logger.error(msg);
      return res.status(HTTP_STATUS.FORBIDDEN).json({error: {message: msg}});
    }

    try {
      // Add user to group
      await db.models.userGroupMember.create({group_id: req.group.id, user_id: user.id});
      await user.reload();
      const {enableV16UserManagement} = nconf.get('keycloak');
      if ((groupIsAdmin || req.group.name === 'manager') && enableV16UserManagement) {
        try {
          const token = req.adminCliToken;
          await grantRealmAdmin(token, user.username, user.email);
        } catch (error) {
          logger.error(`Error while trying to add user to keycloak realm-management`);
          return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            error: {message: 'User creation succeeded but error granting user realm-management role in keycloak'}
          })
        }
      }
      return res.status(HTTP_STATUS.CREATED).json(user.view('public'));
    } catch (error) {
      logger.error(`Error while trying to add user to group ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Error while trying to add user to group'},
      });
    }
  })
  .delete(async (req, res) => {
    try {
      // Validate input
      validateAgainstSchema(memberSchema, req.body);
    } catch (error) {
      const message = `There was an error validating the group member delete request ${error}`;
      logger.error(message);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message}});
    }
    const reqUserIsAdmin = isAdmin(req.user);
    let user;
    try {
      // Lookup User
      user = await db.models.user.findOne({
        where: {ident: req.body.user},
        attributes: ['id', 'ident'],
      });
    } catch (error) {
      logger.error(`Error while trying to find group member user ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Error while trying to find group member user'},
      });
    }

    if (!user) {
      logger.error('User doesn\'t exist');
      return res.status(HTTP_STATUS.NOT_FOUND).json({error: {message: 'User doesn\'t exist'}});
    }

    const groupIsAdmin = req.group.name === 'admin';

    // TODO: add tests for these checks
    if (!reqUserIsAdmin && groupIsAdmin) {
      const msg = 'Non-admin user can not add user to admin group';
      logger.error(msg);
      return res.status(HTTP_STATUS.FORBIDDEN).json({error: {message: msg}});
    }

    const adminGroup = await db.models.userGroup.findOne({
      where: {name: 'admin'},
    });
    const subjectUserIsAdmin = await db.models.userGroupMember.findOne({
      where: {group_id: adminGroup.id, user_id: user.id},
    });

    if (!reqUserIsAdmin && subjectUserIsAdmin) {
      const msg = 'Non-admin user can not edit user groups of admin users';
      logger.error(msg);
      return res.status(HTTP_STATUS.FORBIDDEN).json({error: {message: msg}});
    }
    try {
      // Find membership
      const membership = await db.models.userGroupMember.findOne({
        where: {group_id: req.group.id, user_id: user.id},
      });

      if (!membership) {
        logger.error('User doesn\'t belong to group');
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          error: {message: 'User doesn\'t belong to group'},
        });
      }
      await membership.destroy();
      const {enableV16UserManagement} = nconf.get('keycloak');
      if ((groupIsAdmin || req.group.name === 'manager') && enableV16UserManagement) {
        try {
          const token = req.adminCliToken;
          await ungrantRealmAdmin(token, req.body.username, req.body.email);
        } catch (error) {
          logger.error(`Error while trying to ungrant user keycloak realm-management`);
          return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            error: {message: 'User group removal succeeded but error removing user realm-management role in keycloak'}
          })
        }
      }
      // Remove membership
      return res.status(HTTP_STATUS.NO_CONTENT).send();
    } catch (error) {
      logger.error(`Error while trying to remove user from group ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Error while trying to remove user from group'},
      });
    }
  });

module.exports = router;
