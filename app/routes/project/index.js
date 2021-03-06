const HTTP_STATUS = require('http-status-codes');
const express = require('express');
const {Op} = require('sequelize');
const _ = require('lodash');
const db = require('../../models');
const Acl = require('../../middleware/acl');
const logger = require('../../log');

const router = express.Router({mergeParams: true});

const ERRORS = Object.freeze({
  AccessForbidden: new Error('403 Access denied'),
});

// Middleware for project
router.param('project', async (req, res, next, ident) => {
  // Check user permission and filter by project
  const access = new Acl(req);
  let projectAccess;
  try {
    projectAccess = await access.getProjectAccess();
  } catch (error) {
    logger.error(`Error while geting user's access to projects ${error}`);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Error while geting user\'s access to projects'}});
  }

  const projects = _.intersection(_.map(projectAccess, 'ident'), [ident]);

  if (projects.length < 1) {
    logger.error('Project Access Error');
    return res.status(HTTP_STATUS.FORBIDDEN).json(ERRORS.AccessForbidden);
  }

  try {
    // Add project to request
    req.project = await db.models.project.findOne({
      where: {ident},
      include: [
        {as: 'users', model: db.models.user, attributes: {exclude: ['id', 'deletedAt', 'password', 'jiraToken', 'jiraXsrf', 'settings', 'user_project']}, through: {attributes: []}},
        {as: 'reports', model: db.models.analysis_report, attributes: ['ident', 'patientId', 'alternateIdentifier', 'createdAt', 'updatedAt'], through: {attributes: []}},
      ],
    });
    return next();
  } catch (error) {
    logger.error(`Error while trying to find a project ${error}`);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Error while trying to find a project'}});
  }
});

// Project routes
router.route('/:project([A-z0-9-]{36})')
  .get(async (req, res) => {
    // Getting project
    // Check user permission and filter by project
    const access = new Acl(req);
    let projectAccess;
    try {
      projectAccess = await access.getProjectAccess();
    } catch (error) {
      logger.error(`Error while checking if user has access to project ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Error while checking if user has access to project'}});
    }

    // User has access to project
    if (_.includes(_.map(projectAccess, 'ident'), req.project.ident)) {
      return res.json(req.project.view('public'));
    }

    // User doesn't have access to project
    logger.error('User doesn\'t have access to project');
    return res.status(HTTP_STATUS.FORBIDDEN).json(ERRORS.AccessForbidden);
  })

  .put(async (req, res) => {
    // Access Control
    const access = new Acl(req);
    access.write = ['admin'];
    if (!access.check()) {
      logger.error('User isn\'t allowed to add new project');
      return res.status(HTTP_STATUS.FORBIDDEN).json(ERRORS.AccessForbidden);
    }

    // Attempt project model update
    try {
      await req.project.update(req.body);
      await req.project.reload();
      return res.json(req.project.view('public'));
    } catch (error) {
      logger.error(`Error while trying to update project ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Error while trying to update project'}});
    }
  })
  // Remove a project
  .delete(async (req, res) => {
    // Access Control
    const access = new Acl(req);
    access.write = ['admin'];
    if (!access.check()) {
      logger.error('User isn\'t allowed to remove projects');
      return res.status(HTTP_STATUS.FORBIDDEN).json(ERRORS.AccessForbidden);
    }

    try {
      // Delete project
      await req.project.destroy();
      return res.status(HTTP_STATUS.NO_CONTENT).send();
    } catch (error) {
      logger.error(`Error while trying to remove project ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Error while trying to remove project'}});
    }
  });

// Project Search
router.route('/search')
  .get(async (req, res) => {
    const {query} = req.query;

    // Check user permission and filter by project
    const access = new Acl(req);
    let projectAccess;
    try {
      projectAccess = await access.getProjectAccess();
    } catch (error) {
      logger.error(`Error while geting user's access to projects ${error}`);
      return res.status(HTTP_STATUS.FORBIDDEN).json({error: {message: 'Error while geting user\'s access to projects'}});
    }

    // Get the id's of the projects the user has access to
    const projectIds = projectAccess.map((project) => {
      return project.id;
    });

    let projects;
    try {
      projects = await db.models.project.scope('public').findAll({
        where: {
          id: {[Op.in]: projectIds},
          name: {[Op.iLike]: `%${query}%`},
        },
      });
      return res.json(projects);
    } catch (error) {
      logger.error(`Error while trying to find projects ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Error while trying to find projects'}});
    }
  });

// User Binding Functions
router.route('/:project([A-z0-9-]{36})/user')
  .get((req, res) => {
    // Access Control
    const access = new Acl(req);
    access.read = ['admin'];
    if (!access.check()) {
      logger.error('User isn\'t allowed to get project users');
      return res.status(HTTP_STATUS.FORBIDDEN).json(ERRORS.AccessForbidden);
    }
    // Get Project Users
    return res.json(req.project.users);
  })
  .post(async (req, res) => {
    // Add Project User
    // Access Control
    const access = new Acl(req);
    access.write = ['admin'];
    if (!access.check()) {
      logger.error('User isn\'t allowed to add project users');
      return res.status(HTTP_STATUS.FORBIDDEN).json(ERRORS.AccessForbidden);
    }

    let user;
    try {
      // Lookup User
      user = await db.models.user.findOne({where: {ident: req.body.user}, attributes: {exclude: ['deletedAt', 'password', 'jiraToken']}});
    } catch (error) {
      logger.error(`Error while trying to find user ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Error while trying to find user'}});
    }

    if (!user) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({error: {message: 'Unable to find the supplied user.'}});
    }

    let hasBinding;
    try {
      // See if binding already exists
      hasBinding = await db.models.user_project.findOne({paranoid: false, where: {user_id: user.id, project_id: req.project.id, deletedAt: {[Op.ne]: null}}});
    } catch (error) {
      logger.error(`Error while trying to find user ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Error while trying to find user'}});
    }

    // exists - set deletedAt to null
    if (hasBinding) {
      try {
        await db.models.user_project.update({deletedAt: null}, {
          where: {id: hasBinding.id},
          individualHooks: true,
          paranoid: true,
        });
        return res.status(HTTP_STATUS.CREATED).json(user);
      } catch (error) {
        logger.error(`Error while restoring user project binding ${error}`);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Error while restoring existing user project binding'}});
      }
    }
    // doesn't exist - create new binding
    // Bind User
    try {
      const userProject = await db.models.user_project.create({project_id: req.project.id, user_id: user.id});
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
        user_project: {
          updatedAt: userProject.updatedAt,
          createdAt: userProject.createdAt,
        },
      };

      return res.status(HTTP_STATUS.CREATED).json(output);
    } catch (error) {
      logger.error(`Error while adding user to project ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Error while adding user to project'}});
    }
  })
  .delete(async (req, res) => {
    // Remove Project User
    // Access Control
    const access = new Acl(req);
    access.write = ['admin'];
    if (!access.check()) {
      logger.error('User isn\'t allowed to remove project user');
      return res.status(HTTP_STATUS.FORBIDDEN).json(ERRORS.AccessForbidden);
    }

    let user;
    try {
      // Lookup User
      user = await db.models.user.findOne({where: {ident: req.body.user}, attributes: {exclude: ['deletedAt', 'password', 'jiraToken']}});
    } catch (error) {
      logger.error(`Error while trying to find user ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Error while trying to find user'}});
    }

    if (!user) {
      logger.error('Unable to find the supplied user');
      return res.status(HTTP_STATUS.NOT_FOUND).json({error: {message: 'Unable to find the supplied user'}});
    }

    try {
      // Unbind User
      const unboundUser = await db.models.user_project.destroy({where: {project_id: req.project.id, user_id: user.id}});
      if (!unboundUser) {
        logger.error('Unable to remove user from project');
        return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message: 'Unable to remove user from project'}});
      }
      return res.status(HTTP_STATUS.NO_CONTENT).send();
    } catch (error) {
      logger.error(`Error while removing user from project ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Error while removing user from project'}});
    }
  });

// Report Binding Functions
router.route('/:project([A-z0-9-]{36})/reports')
  .get((req, res) => {
    // Access Control
    const access = new Acl(req);
    access.read = ['admin'];
    if (!access.check()) {
      logger.error('User isn\'t allowed to get project reports');
      return res.status(HTTP_STATUS.FORBIDDEN).json(ERRORS.AccessForbidden);
    }

    // get project reports
    return res.json(req.project.reports);
  })
  .post(async (req, res) => {
    // Add Project report
    // Access Control
    const access = new Acl(req);
    access.write = ['admin', 'Full Project Access'];
    if (!access.check()) {
      logger.error('User isn\'t allowed to add project reports');
      return res.status(HTTP_STATUS.FORBIDDEN).json(ERRORS.AccessForbidden);
    }

    let report;
    try {
      // Lookup report
      report = await db.models.analysis_report.findOne({where: {ident: req.body.report}, attributes: ['id', 'ident']});
      if (!report) {
        logger.error('Unable to find report');
        return res.status(HTTP_STATUS.NOT_FOUND).json({error: {message: 'Unable to find the supplied report'}});
      }
    } catch (error) {
      logger.error(`Error while trying to find report ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Error while trying to find report'}});
    }

    try {
      // Bind report
      const reportProject = await db.models.reportProject.create({project_id: req.project.id, reportId: report.id});
      const output = {
        report: report.ident,
        project: req.project.name,
        createdAt: reportProject.createdAt,
        updatedAt: reportProject.updatedAt,
      };

      return res.status(HTTP_STATUS.CREATED).json(output);
    } catch (error) {
      logger.error(`Error while adding report to project ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Error while adding report to project'}});
    }
  })
  .delete(async (req, res) => {
    // Remove project-report association
    // Access Control
    const access = new Acl(req);
    access.write = ['admin', 'Full Project Access'];
    if (!access.check()) {
      logger.error('User isn\'t allowed to delete project reports');
      return res.status(HTTP_STATUS.FORBIDDEN).json(ERRORS.AccessForbidden);
    }

    let report;
    try {
      // Lookup report
      report = await db.models.analysis_report.findOne({where: {ident: req.body.report}, attributes: ['id']});
      if (!report) {
        logger.error(`Unable to find report ${req.body.report}`);
        return res.status(HTTP_STATUS.NOT_FOUND).json({error: {message: `Unable to find report ${req.body.report}`}});
      }
    } catch (error) {
      logger.error(`Error while trying to find report ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Error while trying to find report'}});
    }

    try {
      // Unbind report
      const reportProject = await db.models.reportProject.destroy({where: {project_id: req.project.id, reportId: report.id}});
      if (!reportProject) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message: 'Unable to remove report from project'}});
      }
      return res.status(HTTP_STATUS.NO_CONTENT).send();
    } catch (error) {
      logger.error(`Error while trying to remove report from project ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Error while trying to remove Report from project'}});
    }
  });

router.route('/')
  // Get All Projects
  .get(async (req, res) => {
    // Access Control
    const includeOpts = [];
    const access = new Acl(req);
    access.read = ['admin'];

    if (access.check() && req.query.admin === true) {
      includeOpts.push({as: 'reports', model: db.models.analysis_report, attributes: ['ident', 'patientId', 'alternateIdentifier', 'createdAt', 'updatedAt'], through: {attributes: []}});
      includeOpts.push({as: 'users', model: db.models.user, attributes: {exclude: ['id', 'deletedAt', 'password', 'jiraToken', 'jiraXsrf', 'settings', 'user_project']}, through: {attributes: []}});
    }

    let projectAccess;
    try {
      // getting project access/filter
      projectAccess = await access.getProjectAccess();
    } catch (error) {
      logger.error(`Error while geting user's access to projects ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Error while geting user\'s access to projects'}});
    }
    // getting project access/filter
    const opts = {
      order: [['createdAt', 'desc']],
      attributes: {
        exclude: ['deletedAt', 'id'],
      },
      include: includeOpts,
      where: {ident: {[Op.in]: _.map(projectAccess, 'ident')}},
    };

    try {
      const projects = await db.models.project.scope('public').findAll(opts);
      return res.json(projects);
    } catch (error) {
      logger.error(`Error while trying to retrieve projects${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to retrieve projects'}});
    }
  })
  .post(async (req, res) => {
    // Add new project
    // Access Control
    const access = new Acl(req);
    access.write = ['admin'];
    if (!access.check()) {
      logger.error('User isn\'t allowed to add new project');
      return res.status(HTTP_STATUS.FORBIDDEN).json(ERRORS.AccessForbidden);
    }

    // Validate input
    const requiredInputs = ['name'];
    const inputErrors = [];

    // Inputs set
    requiredInputs.forEach((input) => {
      if (!req.body[input]) {
        inputErrors.push({
          input,
          message: `${input} is a required input`,
        });
      }
    });

    // Check for existing project
    let existingProject;
    try {
      existingProject = await db.models.project.findOne({where: {name: req.body.name, deletedAt: {[Op.ne]: null}}, paranoid: false});
    } catch (error) {
      logger.error(`Error while trying to find project ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Error while trying to find project'}});
    }

    if (existingProject) {
      // Restore!
      try {
        await existingProject.update({deletedAt: null});
        return res.json(existingProject.view('public'));
      } catch (error) {
        logger.error(`Error while trying to restore project ${error}`);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Error while trying to restore project'}});
      }
    } else {
      if (req.body.name.length < 1) {
        inputErrors.push({input: 'name', message: 'name must be set'});
      }
      // Everything looks good, create the account!
      try {
        const created = await db.models.project.create(req.body);
        return res.status(HTTP_STATUS.CREATED).json(created);
      } catch (error) {
        logger.error(`Error while trying to create project ${error}`);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Error while trying to create project'}});
      }
    }
  });

module.exports = router;
