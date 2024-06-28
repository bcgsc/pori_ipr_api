const HTTP_STATUS = require('http-status-codes');
const express = require('express');
const {Op} = require('sequelize');

const router = express.Router({mergeParams: true});

const db = require('../../models');
const logger = require('../../log');
const {sanitizeHtml, isAdmin} = require('../../libs/helperFunctions');

const schemaGenerator = require('../../schemas/schemaGenerator');
const validateAgainstSchema = require('../../libs/validateAgainstSchema');
const {BASE_EXCLUDE} = require('../../schemas/exclude');

// Generate schema's
const createSchema = schemaGenerator(db.models.templateAppendix, {
  baseUri: '/create', exclude: [...BASE_EXCLUDE, 'templateId'],
});
const updateSchema = schemaGenerator(db.models.templateAppendix, {
  baseUri: '/update', exclude: [...BASE_EXCLUDE, 'templateId'], nothingRequired: true,
});

// Add middleware to get template appendix
router.use('/', async (req, res, next) => {
  try {
    if (req.body.projectId) {
      req.project = await db.models.project.findOne({
        where:
          {ident: req.body.projectId},
      });
    } else {
      req.project = null;
    }

    let projectId;
    if (req.project) {
      req.body.projectId = req.project.id;
      projectId = req.project.id;
    } else {
      projectId = null;
    }
    req.templateAppendix = await db.models.templateAppendix.findOne({
      where:
      {
        [Op.and]: [
          {templateId: req.template.id},
          {projectId},
        ],
      },
      include:
      [{model: db.models.project.scope('public'), as: 'project'}],
    });
  } catch (error) {
    logger.error(`Unable to get template appendix ${error}`);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: {message: 'Unable to get template appendix'},
    });
  }

  // Convert Project ID to ident in GET endpoint
  if (req.project && req.templateAppendix && req.method === 'GET') {
    req.templateAppendix.projectId = req.project.ident;
  }

  // Throw an error if Project ident is provided but not existent
  if (!req.project && req.body.projectId) {
    logger.error(`Invalid project ID for template appendix: ${req.body.projectId}`);
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      error: {message: `Invalid project ID for template appendix: ${req.body.projectId}`},
    });
  }

  // Throw an error for a POST when a template appendix already exists
  if (req.templateAppendix && req.method === 'POST') {
    logger.error(`Template appendix already exists for ${req.template.name}`);
    return res.status(HTTP_STATUS.CONFLICT).json({
      error: {message: `Template appendix already exists for ${req.template.name}`},
    });
  }

  // Throw an error for everything but a POST if the appendix doesn't exist
  if (!req.templateAppendix && req.method !== 'POST') {
    logger.error(`Template appendix does not exist for ${req.template.name}`);
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      error: {message: `Template appendix does not exist for ${req.template.name}`},
    });
  }

  if (!isAdmin(req.user) && req.body.projectId) {
    const userProject = await db.models.userProject.findOne({
      where: {user_id: req.user.id, project_id: req.body.projectId},
    });
    if (!userProject) {
      const msg = 'Non-admin user can not make template appendix changes where project is not in user projects';
      logger.error(msg);
      return res.status(HTTP_STATUS.FORBIDDEN).json({error: {message: msg}});
    }
  }
  return next();
});

// Handle requests for template by ident
router.route('/')
  .get((req, res) => {
    return res.json(req.templateAppendix.view('public'));
  })
  .post(async (req, res) => {
    // Validate request against schema
    try {
      await validateAgainstSchema(createSchema, req.body);
    } catch (error) {
      const message = `Error while validating template appendix create request ${error}`;
      logger.error(message);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message}});
    }

    // Sanitize text
    if (req.body.text) {
      req.body.text = sanitizeHtml(req.body.text);
    }

    // Create new entry in db
    try {
      const result = await db.models.templateAppendix.create({
        ...req.body,
        templateId: req.template.id,
      });
      return res.status(HTTP_STATUS.CREATED).json(result.view('public'));
    } catch (error) {
      logger.error(`Unable to create template appendix ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Unable to create template appendix'},
      });
    }
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
      return res.json(req.templateAppendix.view('public'));
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
