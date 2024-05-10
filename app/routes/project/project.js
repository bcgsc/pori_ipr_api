const HTTP_STATUS = require('http-status-codes');
const express = require('express');
const {Op} = require('sequelize');

const Sequelize = require('sequelize');
const db = require('../../models');
const logger = require('../../log');

const projectMiddleware = require('../../middleware/project');
const {hasMasterAccess} = require('../../libs/helperFunctions');

const schemaGenerator = require('../../schemas/schemaGenerator');
const validateAgainstSchema = require('../../libs/validateAgainstSchema');
const {REPORT_CREATE_BASE_URI, REPORT_UPDATE_BASE_URI} = require('../../constants');

const router = express.Router({mergeParams: true});

// Generate schema's
const createSchema = schemaGenerator(db.models.project, {baseUri: REPORT_CREATE_BASE_URI});
const updateSchema = schemaGenerator(db.models.project, {
  baseUri: REPORT_UPDATE_BASE_URI,
  nothingRequired: true,
});

router.param('project', projectMiddleware);

// TODO add manager/admin restrictions

// Project routes
router.route('/:project([A-z0-9-]{36})')
  .get(async (req, res) => {
    if (hasMasterAccess(req.user)) {
      return res.json(req.project.view('public'));
    }
    return res.json(req.project.view('nonMaster'));
  })
  .put(async (req, res) => {
    try {
      // validate against the model
      validateAgainstSchema(updateSchema, req.body, false);
    } catch (error) {
      const message = `There was an error updating project ${error}`;
      logger.error(message);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message}});
    }

    try {
      await req.project.update(req.body, {userId: req.user.id});
      await req.project.reload();
      return res.json(req.project.view('public'));
    } catch (error) {
      logger.error(`Error while trying to update project ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Error while trying to update project'},
      });
    }
  })
  .delete(async (req, res) => {
    try {
      await req.project.destroy();
      return res.status(HTTP_STATUS.NO_CONTENT).send();
    } catch (error) {
      logger.error(`Error while trying to remove project ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Error while trying to remove project'},
      });
    }
  });

router.route('/')
  .get(async (req, res) => {
    let projectAccess;
    try {
      projectAccess = await db.models.project.scope('public').findAll();
    } catch (error) {
      logger.error(`Error while getting user's access to projects ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Error while getting user\'s access to projects'},
      });
    }

    const opts = {
      order: [['createdAt', 'desc']],
      attributes: {
        include: [[Sequelize.fn('COUNT', Sequelize.col('reports.id')), 'reportCount']],
      },
      include: [
        {
          as: 'reports',
          model: db.models.report,
          attributes: [],
          through: {attributes: []},
        },
        {
          as: 'users',
          model: db.models.user,
          attributes: {exclude: ['id', 'deletedAt', 'password', 'updatedBy']},
          through: {attributes: []},
        },
      ],
      where: {
        ident: projectAccess.map((project) => {
          return project.ident;
        }),
      },
      group: ['project.id', 'users.id'],
    };

    try {
      const projects = await db.models.project.scope('public').findAll(opts);
      return res.json(projects);
    } catch (error) {
      logger.error(`Error while trying to retrieve projects${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Unable to retrieve projects'},
      });
    }
  })
  .post(async (req, res) => {
    try {
      // validate request against the model
      validateAgainstSchema(createSchema, req.body);
    } catch (error) {
      const message = `Error while validating project create request ${error}`;
      logger.error(message);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message}});
    }

    try {
      const [result, created] = await db.models.project.findOrCreate({
        where: {name: {[Op.iLike]: req.body.name}},
        defaults: req.body,
      });

      if (!created) {
        logger.error(`Project ${req.body.name} already exists`);
        return res.status(HTTP_STATUS.CONFLICT).json({error: {message: 'Project already exists'}});
      }

      return res.status(HTTP_STATUS.CREATED).json(result.view('public'));
    } catch (error) {
      logger.error(`Error while trying to find/create project ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Error while trying to find/create project'},
      });
    }
  });

module.exports = router;
