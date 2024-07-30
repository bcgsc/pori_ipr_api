const HTTP_STATUS = require('http-status-codes');
const express = require('express');
const {Op} = require('sequelize');

const db = require('../../models');
const logger = require('../../log');

const {
  getUserProjects,
  sanitizeHtml,
  projectAccess,
} = require('../../libs/helperFunctions');
const schemaGenerator = require('../../schemas/schemaGenerator');
const validateAgainstSchema = require('../../libs/validateAgainstSchema');
const {BASE_EXCLUDE} = require('../../schemas/exclude');

const router = express.Router({mergeParams: true});

// Generate schema's
const createSchema = schemaGenerator(db.models.variantText, {
  baseUri: '/create', exclude: [...BASE_EXCLUDE],
});
const updateSchema = schemaGenerator(db.models.variantText, {
  baseUri: '/update', include: ['text'], nothingRequired: true,
});

const pairs = {
  project: db.models.project,
  template: db.models.template,
};

// for each entry in pairs, assumes the key-named value in
// req.body is the ident, and gets the id of the corresponding object.
router.use(async (req, res, next) => {
  const operations = [];

  for (const [key, value] of Object.entries(pairs)) {
    // delete user input ids for safety
    delete req.body[`${key}Id`];
    if (req.body[key]) {
      const operation = value.findOne({
        where: {ident: req.body[key]},
      }).then((obj) => {
        if (!obj || !obj.id) {
          logger.error(`Unable to find ${key} ${req.body[key]}`);
          // Throw an error object that includes a status code
          const error = new Error(`Unable to find ${key}`);
          error.statusCode = HTTP_STATUS.NOT_FOUND;
          throw error;
        }
        req.body[`${key}Id`] = obj.id;
      });

      operations.push(operation);
    }
  }

  try {
    await Promise.all(operations);
    next();
  } catch (error) {
    logger.error(`Error while trying to find key: ${error.message}`);
    // Use the status code from the error object, if it exists; otherwise, use 500
    const statusCode = error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
    res.status(statusCode).json({
      error: {message: `Error while trying to find key: ${error.message}`},
    });
  }
});

// Middleware for variant text
router.param('variantText', async (req, res, next, ident) => {
  let result;
  try {
    result = await db.models.variantText.findOne({
      where: {ident},
      include: [
        {model: db.models.template.scope('minimal'), as: 'template'},
        {model: db.models.project.scope('minimal'), as: 'project'},
      ],
    });
  } catch (error) {
    logger.error(`Error while trying to get variant text ${error}`);
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: {message: 'Error while trying to get variant text'},
    });
  }

  if (!result) {
    logger.error('Unable to find variant text');
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      error: {message: 'Unable to find variant text'},
    });
  }

  if (result.project.ident) {
    const userHasProjectAccess = projectAccess(req.user, {projects: [{ident: result.project.ident}]});

    if (!userHasProjectAccess) {
      logger.error(`user ${req.user.username} does not have access to project ${req.body.project}`);
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        error: {message: `user ${req.user.username} does not have access to variant text ${req.body.project}`},
      });
    }
  }

  req.variantText = result;
  return next();
});

router.route('/:variantText([A-z0-9-]{36})')
  .get(async (req, res) => {
    return res.json(req.variantText.view('public'));
  })
  .put(async (req, res) => {
    try {
      // validate against the model
      validateAgainstSchema(updateSchema, req.body, false);
    } catch (error) {
      const message = `There was an error validating variant text ${error}`;
      logger.error(message);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message}});
    }

    if (req.body.text) {
      req.body.text = sanitizeHtml(req.body.text);
    }

    try {
      await req.variantText.update(req.body, {userId: req.user.id});
      await req.variantText.reload();
      return res.json(req.variantText.view('public'));
    } catch (error) {
      logger.error(`Error while trying to update variant text ${error}`);
      if (`${error}` === 'SequelizeUniqueConstraintError: Validation error') {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          error: {message: 'Error while creating variant text: Variant text not unique'},
        });
      }
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Error while trying to update variant text'},
      });
    }
  })
  .delete(async (req, res) => {
    try {
      await req.variantText.destroy();
      return res.status(HTTP_STATUS.NO_CONTENT).send();
    } catch (error) {
      logger.error(`Error while trying to remove variant text ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Error while trying to remove variant text'},
      });
    }
  });
router.route('/')
  .get(async (req, res) => {
    const userProjects = await getUserProjects(db.models.project, req.user);
    const projectIdents = userProjects.map((project) => {return project.ident;});

    if (req.body.project) {
      const userHasProjectAccess = projectAccess(req.user, {projects: [{ident: req.body.project}]});

      if (!userHasProjectAccess) {
        logger.error(`user ${req.user.username} does not have access to variant text ${req.body.project}`);
        return res.status(HTTP_STATUS.FORBIDDEN).json({
          error: {message: `user ${req.user.username} does not have access to variant text ${req.body.project}`},
        });
      }
    }

    try {
      const whereClause = {
        ...((req.body.templateId == null) ? {} : {templateId: req.body.templateId}),
        ...((req.body.projectId == null) ? {} : {projectId: req.body.projectId}),
        ...((req.body.variantName == null) ? {} : {variantName: req.body.variantName}),
        ...((req.body.cancerType == null) ? {}
          : {cancerType: {[Op.contains]: [req.body.cancerType]}}),
      };

      let results = await db.models.variantText.scope('public').findAll({
        where: whereClause,
      });

      results = results.filter((variantText) => {
        if (variantText.project.ident) {
          return projectIdents.includes(variantText.project.ident);
        }
        return true;
      });

      return res.json(results);
    } catch (error) {
      logger.error(`${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Problem getting variant text'},
      });
    }
  })
  .post(async (req, res) => {
    // Validate request against schema
    try {
      delete req.body.project;
      delete req.body.template;

      await validateAgainstSchema(createSchema, req.body);
    } catch (error) {
      const message = `Error while validating variant text create request ${error}`;
      logger.error(message);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message}});
    }

    try {
      // Sanitize text
      if (req.body.text) {
        req.body.text = sanitizeHtml(req.body.text);
      }

      const newVariantText = await db.models.variantText.create(
        req.body,
      );

      // Load new variant text with associations
      const result = await db.models.variantText.scope('public').findOne({
        where: {id: newVariantText.id},
      });

      return res.status(HTTP_STATUS.CREATED).json(result);
    } catch (error) {
      logger.error(`Error while creating variant text ${error}`);
      if (`${error}` === 'SequelizeUniqueConstraintError: Validation error') {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          error: {message: 'Error while creating variant text: Variant text not unique'},
        });
      }
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Error while creating variant text'},
      });
    }
  });

module.exports = router;
