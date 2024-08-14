const HTTP_STATUS = require('http-status-codes');
const express = require('express');

const db = require('../../models');
const logger = require('../../log');

const groupMiddleware = require('../../middleware/group');

const router = express.Router({mergeParams: true});

const schemaGenerator = require('../../schemas/schemaGenerator');
const validateAgainstSchema = require('../../libs/validateAgainstSchema');
const {BASE_EXCLUDE} = require('../../schemas/exclude');


// Generate schema's
const groupCreateSchema = schemaGenerator(db.models.userGroup, {
  baseUri: '/create',
  exclude: [...BASE_EXCLUDE],
  nothingRequired: true,
});

const groupUpdateSchema = schemaGenerator(db.models.userGroup, {
  baseUri: '/update',
  exclude: [...BASE_EXCLUDE],
  nothingRequired: true,
});

// Register group middleware
router.param('group', groupMiddleware);

// Routes for operating on a single user group
router.route('/:group([A-z0-9-]{36})')
  .get((req, res) => {
    return res.json(req.group.view('public'));
  })
  .put(async (req, res) => {
    try {
      // Validate input
      validateAgainstSchema(groupUpdateSchema, req.body, false);
    } catch (error) {
      const message = `There was an error validating the user group update request ${error}`;
      logger.error(message);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message}});
    }

    // Update Group
    try {
      await req.group.update(req.body, {userId: req.user.id});
      await req.group.reload();
      return res.json(req.group.view('public'));
    } catch (error) {
      logger.error(`Error while updating user group ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Error while updating user group'},
      });
    }
  })

  .delete(async (req, res) => {
    try {
      await req.group.destroy();
      return res.status(HTTP_STATUS.NO_CONTENT).send();
    } catch (error) {
      logger.error(`Error while trying to remove user group ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Error while trying to remove user group'},
      });
    }
  });

// Routes for operating on all user groups
router.route('/')
  // Get all user groups
  .get(async (req, res) => {
    try {
      const groups = await db.models.userGroup.scope('public').findAll();
      return res.json(groups);
    } catch (error) {
      logger.error(`Error while getting all user groups ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Error while getting all user groups'},
      });
    }
  })
  .post(async (req, res) => {
    try {
      // Validate input
      validateAgainstSchema(groupCreateSchema, req.body);
    } catch (error) {
      const message = `There was an error validating the user group create request ${error}`;
      logger.error(message);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message}});
    }

    try {
      // Add new group
      const newGroup = await db.models.userGroup.create(req.body);

      const result = await db.models.userGroup.scope('public').findOne({
        where: {ident: newGroup.ident},
      });

      return res.status(HTTP_STATUS.CREATED).json(result);
    } catch (error) {
      logger.error(`Error while creating new user group ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Error while creating new user group'},
      });
    }
  });

module.exports = router;
