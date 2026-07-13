const HTTP_STATUS = require('http-status-codes');
const express = require('express');
const {Op} = require('sequelize');

const db = require('../../models');
const logger = require('../../log');

const {
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
  baseUri: '/update', include: ['cancerType', 'text'], nothingRequired: true,
});

const pairs = {
  template: db.models.template,
};

const variantTextPublicAttributes = {
  exclude: ['id', 'deletedAt', 'updatedBy', 'templateId'],
};

const variantTextPublicInclude = [
  {model: db.models.template.scope('minimal'), as: 'template'},
  {
    model: db.models.project.scope('variantText'),
    as: 'projects',
    through: {attributes: []},
  },
];

const hasProjectAccessForAll = (user, projectIdents = []) => {
  return projectIdents.every((ident) => {
    return projectAccess(user, {projects: [{ident}]});
  });
};

// for each entry in pairs, assumes the key-named value in
// req.body is the ident, and gets the id of the corresponding object.
router.use(async (req, res, next) => {
  const operations = [];

  delete req.body.projectId;
  delete req.body.projectIds;

  if (req.body.project && !req.body.projects) {
    req.body.projects = [req.body.project];
  }

  if (req.body.projects && !Array.isArray(req.body.projects)) {
    req.body.projects = [req.body.projects];
  }

  if (Array.isArray(req.body.projects)) {
    req.body.projects = [...new Set(req.body.projects.filter((ident) => {return Boolean(ident);}))];
  }

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

  if (Array.isArray(req.body.projects) && req.body.projects.length) {
    const operation = db.models.project.findAll({
      where: {
        ident: req.body.projects,
      },
    }).then((projects) => {
      if (projects.length !== req.body.projects.length) {
        const foundProjectIdents = projects.map((project) => {return project.ident;});
        const missingProjectIdent = req.body.projects.find((ident) => {
          return !foundProjectIdents.includes(ident);
        });

        logger.error(`Unable to find project ${missingProjectIdent}`);
        const error = new Error('Unable to find project');
        error.statusCode = HTTP_STATUS.NOT_FOUND;
        throw error;
      }

      req.body.projectIds = projects.map((project) => {return project.id;});
    });

    operations.push(operation);
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
      include: variantTextPublicInclude,
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

  if (result.projects?.length) {
    const userHasProjectAccess = projectAccess(req.user, {projects: result.projects});

    if (!userHasProjectAccess) {
      logger.error(`user ${req.user.username} does not have access to variant text ${ident}`);
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        error: {message: `user ${req.user.username} does not have access to variant text ${ident}`},
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
    const requestedProjectIdentsRaw = req.body.projects || (req.body.project ? [req.body.project] : []);
    const requestedProjectIdents = (Array.isArray(requestedProjectIdentsRaw) ? requestedProjectIdentsRaw : [requestedProjectIdentsRaw])
      .map((project) => {
        if (typeof project === 'string') {
          return project;
        }

        return project?.ident;
      })
      .filter((ident) => {return Boolean(ident);});

    if (requestedProjectIdents.length && !hasProjectAccessForAll(req.user, requestedProjectIdents)) {
      logger.error(`user ${req.user.username} does not have access to variant text projects ${requestedProjectIdents.join(', ')}`);
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        error: {message: `user ${req.user.username} does not have access to all requested projects`},
      });
    }

    let requestedProjectIds;
    if (requestedProjectIdents.length) {
      const projects = await db.models.project.findAll({
        where: {
          ident: requestedProjectIdents,
        },
      });

      if (projects.length !== requestedProjectIdents.length) {
        const foundProjectIdents = projects.map((project) => {return project.ident;});
        const missingProjectIdent = requestedProjectIdents.find((ident) => {
          return !foundProjectIdents.includes(ident);
        });

        logger.error(`Unable to find project ${missingProjectIdent}`);
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          error: {message: 'Unable to find project'},
        });
      }

      requestedProjectIds = projects.map((project) => {return project.id;});
    }

    const variantTextBody = {...req.body};
    delete variantTextBody.project;
    delete variantTextBody.projects;
    delete variantTextBody.projectIds;

    try {
      // validate against the model
      validateAgainstSchema(updateSchema, variantTextBody, false);
    } catch (error) {
      const message = `There was an error validating variant text ${error}`;
      logger.error(message);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message}});
    }

    if (variantTextBody.text) {
      variantTextBody.text = sanitizeHtml(variantTextBody.text);
    }

    try {
      if (Object.keys(variantTextBody).length) {
        await req.variantText.update(variantTextBody, {userId: req.user.id});
      }

      if (Array.isArray(requestedProjectIds)) {
        await req.variantText.setProjects(requestedProjectIds);
      }

      const updatedVariantText = await db.models.variantText.findOne({
        where: {id: req.variantText.id},
        attributes: variantTextPublicAttributes,
        include: variantTextPublicInclude,
      });

      return res.json(updatedVariantText.view('public'));
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
    const requestedProjectIds = Array.isArray(req.body.projectIds) ? req.body.projectIds : [];

    try {
      const whereClause = {
        ...((req.body.templateId == null) ? {} : {templateId: req.body.templateId}),
        ...((req.body.variantName == null) ? {} : {variantName: req.body.variantName}),
        ...((req.body.cancerType == null) ? {}
          : {cancerType: {[Op.contains]: [req.body.cancerType]}}),
      };

      let results = await db.models.variantText.findAll({
        where: whereClause,
        attributes: variantTextPublicAttributes,
        include: variantTextPublicInclude,
      });

      results = results.filter((variantText) => {
        const variantTextProjectIds = (variantText.projects || []).map((project) => {return project.id;});

        if (requestedProjectIds.length && !variantTextProjectIds.some((projectId) => {return requestedProjectIds.includes(projectId);})) {
          return false;
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
    const requestedProjectIdents = req.body.projects || (req.body.project ? [req.body.project] : []);

    if (!requestedProjectIdents.length) {
      const message = 'Error while validating variant text create request at least one project is required';
      logger.error(message);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message}});
    }

    if (!hasProjectAccessForAll(req.user, requestedProjectIdents)) {
      logger.error(`user ${req.user.username} does not have access to variant text projects ${requestedProjectIdents.join(', ')}`);
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        error: {message: `user ${req.user.username} does not have access to all requested projects`},
      });
    }

    // Validate request against schema
    const createBody = {...req.body};

    try {
      delete createBody.project;
      delete createBody.projects;
      delete createBody.projectIds;
      delete createBody.template;

      if (typeof createBody.cancerType === 'string') {
        createBody.cancerType = [createBody.cancerType];
      }

      await validateAgainstSchema(createSchema, createBody);
    } catch (error) {
      const message = `Error while validating variant text create request ${error}`;
      logger.error(message);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message}});
    }

    try {
      // Sanitize text
      if (createBody.text) {
        createBody.text = sanitizeHtml(createBody.text);
      }

      const newVariantText = await db.models.variantText.create(
        createBody,
      );

      await newVariantText.setProjects(req.body.projectIds || []);

      // Load new variant text with associations
      const result = await db.models.variantText.findOne({
        where: {id: newVariantText.id},
        attributes: variantTextPublicAttributes,
        include: variantTextPublicInclude,
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
