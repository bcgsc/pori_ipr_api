const HTTP_STATUS = require('http-status-codes');
const express = require('express');
const {Op} = require('sequelize');

const router = express.Router({mergeParams: true});

const db = require('../../models');
const logger = require('../../log');
const {sanitizeHtml} = require('../../libs/helperFunctions');

const schemaGenerator = require('../../schemas/schemaGenerator');
const validateAgainstSchema = require('../../libs/validateAgainstSchema');
const {BASE_EXCLUDE} = require('../../schemas/exclude');

// Generate schema's
const updateSchema = schemaGenerator(db.models.templateAppendix, {
  baseUri: '/update', exclude: [...BASE_EXCLUDE], nothingRequired: true,
});

// Add middleware to get template appendix
router.use('/', async (req, res, next) => {
  try {
    if (!req.body.projectId && !req.body.templateId) {
      req.templateAppendix = await db.models.templateAppendix.scope('public').findAll();
    } else {
      if (!req.body.projectId) {
        req.body.projectId = null;
      }
      if (!req.body.templateId) {
        req.body.templateId = null;
      }
      req.templateAppendix = await db.models.templateAppendix.findOne({
        where:
              {
                [Op.and]: [
                  {templateId: req.body.templateId},
                  {projectId: req.body.projectId},
                ],
              },
        include:
              [{model: db.models.project.scope('public'), as: 'project'}],
      });
    }
  } catch (error) {
    logger.error(`Unable to get template appendix ${error}`);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: {message: 'Unable to get template appendix'},
    });
  }
  return next();
});

router.route('/')
  .get(async (req, res) => {
    if (!req.templateAppendix.length) {
      return res.json(req.templateAppendix.view('public'));
    }
    return res.json(req.templateAppendix);
  })
  .put(async (req, res) => {
    // Validate request against schema
    try {
      validateAgainstSchema(updateSchema, req.body, false);
    } catch (error) {
      const message = `Error while validating template appendix update request ${error}`;
      logger.error(message);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message}});
    }

    // Sanitize text
    if (req.body.text) {
      req.body.text = sanitizeHtml(req.body.text);
    }

    // Update db entry
    try {
      await req.templateAppendix.update(req.body, {userId: req.user.id});
      return res.json(req.templateAppendix);
    } catch (error) {
      logger.error(`Unable to update template appendix ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Unable to update template appendix'},
      });
    }
  })
  .delete(async (req, res) => {
    // Soft delete template appendix
    try {
      await req.templateAppendix.destroy();
      return res.status(HTTP_STATUS.NO_CONTENT).send();
    } catch (error) {
      logger.error(`Error while removing template appendix ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Error while removing template appendix'},
      });
    }
  });

module.exports = router;
