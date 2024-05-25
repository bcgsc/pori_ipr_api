const HTTP_STATUS = require('http-status-codes');
const express = require('express');
const {Op} = require('sequelize');

const router = express.Router({mergeParams: true});

const db = require('../../models');
const logger = require('../../log');
const {sanitizeHtml, isAdmin, hasAllProjectsAccess} = require('../../libs/helperFunctions');

const schemaGenerator = require('../../schemas/schemaGenerator');
const validateAgainstSchema = require('../../libs/validateAgainstSchema');
const {BASE_EXCLUDE} = require('../../schemas/exclude');

// Generate schema's
const updateSchema = schemaGenerator(db.models.templateAppendix, {
  baseUri: '/update', exclude: [...BASE_EXCLUDE], nothingRequired: true,
});

// Add middleware to get template appendix
router.use('/', async (req, res, next) => {
  const {
    query: {
      templateId, projectId,
    },
  } = req;
  try {
    if (!templateId && !projectId) {
      req.templateAppendix = await db.models.templateAppendix.scope('public').findAll({include: [
        {model: db.models.template.scope('minimal'), as: 'template'},
        {model: db.models.project.scope('public'), as: 'project'},
      ]});
    } else {
      if (templateId !== 'null') {
        req.template = await db.models.template.findOne({
          where:
            {ident: templateId},
        });
        req.templateId = req.template.id;
      } else {
        req.templateId = null;
      }

      if (projectId !== 'null' && projectId) {
        req.project = await db.models.project.findOne({
          where:
            {ident: projectId},
        });
        req.projectId = req.project.id;
      } else {
        req.projectId = null;
      }
      req.templateAppendix = await db.models.templateAppendix.findOne({
        where:
              {
                [Op.and]: [
                  {templateId: req.templateId},
                  {projectId: req.projectId},
                ],
              },
        include:
              [{model: db.models.template.scope('minimal'), as: 'template'},
                {model: db.models.project.scope('public'), as: 'project'}],
      });

      // when there is no template with specific project id
      if (!req.templateAppendix) {
        req.templateAppendix = await db.models.templateAppendix.findOne({
          where:
                {
                  [Op.and]: [
                    {templateId: req.template.id},
                    {projectId: null},
                  ],
                },
          include:
                [{model: db.models.template.scope('minimal'), as: 'template'},
                  {model: db.models.project.scope('public'), as: 'project'}],
        });
      }

      // Throw an error for a POST when a template appendix already exists
      if (req.templateAppendix && req.method === 'POST') {
        if (req.project) {
          const msg = `Template appendix already exists for ${req.template.name} for project ${req.project.name}`;
          logger.error(msg);
          return res.status(HTTP_STATUS.CONFLICT).json({
            error: {message: msg},
          });
        }
        const msg = `Non-project specific template appendix already exists for ${req.template.name}`;
        logger.error(msg);
        return res.status(HTTP_STATUS.CONFLICT).json({
          error: {message: msg},
        });
      }
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
  .post(async (req, res) => {
    try {
      validateAgainstSchema(updateSchema, req.body, false);
    } catch (error) {
      const message = `Error while validating template appendix update request ${error}`;
      logger.error(message);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message}});
    }

    const userProjects = (req.user.projects).map((elem) => {return elem.name;});
    // if user is manager and does not have the project id for this appendix
    if (!isAdmin(req.user) && !hasAllProjectsAccess(req.user) && !userProjects.includes(req.project?.name)) {
      const msg = 'Non-admin user can not create template text without project membership';
      logger.error(msg);
      return res.status(HTTP_STATUS.FORBIDDEN).json({error: {msg}});
    }

    // Sanitize text
    if (req.body.text) {
      req.body.text = sanitizeHtml(req.body.text);
    }

    // Create new entry in db
    try {
      let result;
      if (req.project) {
        result = await db.models.templateAppendix.create({
          ...req.body,
          templateId: req.template.id,
          projectId: req.project.id,
        });
      } else {
        result = await db.models.templateAppendix.create({
          ...req.body,
          templateId: req.template.id,
        });
      }
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

    const userProjects = (req.user.projects).map((elem) => {return elem.name;});
    // if user is manager and does not have the project id for this appendix
    if (!isAdmin(req.user) && !hasAllProjectsAccess(req.user) && !userProjects.includes(req.templateAppendix.project?.name)) {
      const msg = 'Non-admin user can not edit template text without project membership';
      logger.error(msg);
      return res.status(HTTP_STATUS.FORBIDDEN).json({error: {msg}});
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
    const userProjects = (req.user.projects).map((elem) => {return elem.name;});
    // if user is manager and does not have the project id for this appendix
    if (!isAdmin(req.user) && !hasAllProjectsAccess(req.user) && !userProjects.includes(req.templateAppendix.project?.name)) {
      const msg = 'Non-admin user can not delete template text without project membership';
      logger.error(msg);
      return res.status(HTTP_STATUS.FORBIDDEN).json({error: {msg}});
    }

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
