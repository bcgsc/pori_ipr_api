const express = require('express');
const _ = require('lodash');
const db = require('../../models');
const Acl = require('../../middleware/acl');

const router = express.Router({mergeParams: true});
const {logger} = process;

const ERRORS = Object.freeze({
  AccessForbidden: new Error('403 Access denied'),
});

// Middleware for project resolution
router.param('project', async (req, res, next, ident) => {
  // Check user permission and filter by project
  const access = new Acl(req, res);
  let projectAccess;
  try {
    projectAccess = await access.getProjectAccess();
  } catch (error) {
    logger.error(`User doesn't have access to project ${error}`);
    return res.status(403).json(ERRORS.AccessForbidden);
  }

  const projects = _.intersection(_.map(projectAccess, 'ident'), [ident]);

  if (projects.length < 1) {
    logger.error('Project Access Error');
    return res.status(403).json(ERRORS.AccessForbidden);
  }

  // Lookup project!
  const opts = {
    where: {ident},
    attributes: {exclude: ['deletedAt']},
    include: [
      {as: 'users', model: db.models.user, attributes: {exclude: ['id', 'deletedAt', 'password', 'access', 'jiraToken']}},
      {as: 'pogs', model: db.models.POG.scope('public')},
    ],
  };

  try {
    req.project = await db.models.project.findOne(opts);
    return next();
  } catch (error) {
    logger.error(`Failed to find project ${error}`);
    return res.status(500).json(error);
  }
});

// Route for getting a project
router.route('/')
  // Get All Projects
  .get(async (req, res) => {
    // Access Control
    const includeOpts = [];
    const access = new Acl(req, res);
    access.read = ['admin', 'superUser'];

    if (access.check(true) && req.query.admin === 'true') {
      includeOpts.push({as: 'pogs', model: db.models.POG, attributes: {exclude: ['id', 'deletedAt']}});
      includeOpts.push({as: 'users', model: db.models.user, attributes: {exclude: ['id', 'deletedAt', 'password', 'access', 'jiraToken', 'jiraXsrf', 'settings', 'user_project']}});
    }

    let projectAccess;
    try {
      // getting project access/filter
      projectAccess = await access.getProjectAccess();
    } catch (error) {
      logger.error(`User doesn't have access to project ${error}`);
      return res.status(403).json(ERRORS.AccessForbidden);
    }
    // getting project access/filter
    const opts = {
      order: [['createdAt', 'desc']],
      attributes: {
        exclude: ['deletedAt', 'id'],
      },
      include: includeOpts,
      where: {ident: {$in: _.map(projectAccess, 'ident')}},
    };

    try {
      const projects = await db.models.project.findAll(opts);
      return res.json(projects);
    } catch (error) {
      logger.error(`Unable to retrieve projects ${error}`);
      return res.status(500).json({message: 'Unable to retrieve projects'});
    }
  })
  .post(async (req, res) => {
    // Add new project
    // Access Control
    const access = new Acl(req, res);
    access.write = ['admin', 'superUser'];
    if (!access.check()) {
      logger.error('User isn\'t allowed to add new project');
      return res.status(403).json(ERRORS.AccessForbidden);
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
      existingProject = await db.models.project.findOne({where: {name: req.body.name, deletedAt: {$not: null}}, paranoid: false});
    } catch (error) {
      logger.error(`Unable to find project ${error}`);
      return res.status(500).json({error: {message: 'Unable to find project'}});
    }

    if (existingProject) {
      // Restore!
      try {
        const restored = await db.models.project.update({deletedAt: null}, {paranoid: false, where: {ident: existingProject.ident}, returning: true});
        return res.status(201).json(restored);
      } catch (error) {
        logger.error(`Unable to restore project ${error}`);
        return res.status(500).json({error: {message: 'Unable to restore project'}});
      }
    } else {
      if (req.body.name.length < 1) {
        inputErrors.push({input: 'name', message: 'name must be set'});
      }
      // Everything looks good, create the account!
      try {
        const created = await db.models.project.create(req.body);
        return res.status(201).json(created);
      } catch (error) {
        logger.error(`Unable to create project ${error}`);
        return res.status(500).json({error: {message: 'Unable to create project'}});
      }
    }
  });

router.route('/:ident([A-z0-9-]{36})')
  .get(async (req, res) => {
    // Getting project
    // Check user permission and filter by project
    const access = new Acl(req, res);
    let projectAccess;
    try {
      projectAccess = await access.getProjectAccess();
    } catch (error) {
      logger.error(`User doesn't have access to project ${error}`);
      return res.status(403).json(ERRORS.AccessForbidden);
    }

    if (_.includes(_.map(projectAccess, 'ident'), req.project.ident)) {
      return res.json(req.project);
    }

    logger.error('User doesn\'t have access to project');
    return res.status(403).json(ERRORS.AccessForbidden);
  })

  .put(async (req, res) => {
    // Access Control
    const access = new Acl(req, res);
    access.write = ['admin', 'superUser'];
    if (!access.check()) {
      logger.error('User isn\'t allowed to add new project');
      return res.status(403).json(ERRORS.AccessForbidden);
    }

    // Update project
    const updateBody = {
      name: req.body.name,
    };

    let modelUpdate;
    try {
      // Attempt project model update
      modelUpdate = await db.models.project.update(updateBody, {where: {ident: req.body.ident}, limit: 1});
    } catch (error) {
      logger.error(`Unable to update project ${error}`);
      return res.status(500).json({error: {message: 'Unable to update project', code: 'failedProjectUpdateQuery'}});
    }

    if (modelUpdate) {
      return res.json(modelUpdate);
    }

    // Success, get project -- UGH
    const opts = {
      where: {ident: req.body.ident},
      attributes: {exclude: ['id']},
      include: [
        {as: 'users', model: db.models.user, attributes: {exclude: ['id', 'deletedAt', 'password', 'access', 'jiraToken', 'jiraXsrf', 'settings', 'user_project']}},
        {as: 'pogs', model: db.models.POG, attributes: {exclude: ['id', 'deletedAt']}},
      ],
    };

    try {
      const project = await db.models.project.findOne(opts);
      return res.json(project);
    } catch (error) {
      logger.error(`Unable to retrieve project ${error}`);
      return res.status(500).json({error: {message: 'Unable to retrieve project', code: 'failedProjectLookupQuery'}});
    }
  })
  // Remove a project
  .delete(async (req, res) => {
    // Access Control
    const access = new Acl(req, res);
    access.write = ['admin', 'superUser'];
    if (!access.check()) {
      logger.error('User isn\'t allowed to remove projects');
      return res.status(403).json(ERRORS.AccessForbidden);
    }

    try {
      // Delete project
      const result = await db.models.project.destroy({where: {ident: req.params.ident}, limit: 1});
      if (!result) {
        return res.status(400).json({error: {message: 'Unable to remove the requested project', code: 'failedProjectRemove'}});
      }
      return res.status(204).send();
    } catch (error) {
      logger.error(`Failed to remove project ${error}`);
      return res.status(500).json({error: {message: 'Unable to remove the requested project', code: 'failedProjectRemoveQuery'}});
    }
  });

// Project Search
router.route('/search')
  .get(async (req, res) => {
    const {query} = req.query;

    const where = {
      name: {$ilike: `%${query}%`},
    };

    let projects;
    try {
      projects = await db.models.project.findAll({where, attributes: {exclude: ['deletedAt', 'id']}});
    } catch (error) {
      logger.error(`Unable to find projects ${error}`);
      return res.status(500).json({error: {message: 'Unable to query project search'}});
    }

    // Check user permission and filter by project
    const access = new Acl(req, res);
    try {
      const projectAccess = await access.getProjectAccess();
      const filteredResults = _.map(projects, (project) => {
        if (_.includes(_.map(projectAccess, 'ident'), project.ident)) {
          return project;
        }
      });
      return res.json(filteredResults);
    } catch (error) {
      logger.error(`User doesn't have access to project ${error}`);
      return res.status(403).json(ERRORS.AccessForbidden);
    }
  });

// User Binding Functions
router.route('/:project([A-z0-9-]{36})/user')
  .get((req, res) => {
    // Access Control
    const access = new Acl(req, res);
    access.read = ['admin', 'superUser'];
    if (!access.check()) {
      logger.error('User isn\'t allowed to get project users');
      return res.status(403).json(ERRORS.AccessForbidden);
    }
    // Get Project Users
    return res.json(req.project.users);
  })
  .post(async (req, res) => {
    // Add Project User
    // Access Control
    const access = new Acl(req, res);
    access.write = ['admin', 'superUser'];
    if (!access.check()) {
      logger.error('User isn\'t allowed to add project users');
      return res.status(403).json(ERRORS.AccessForbidden);
    }

    let user;
    try {
      // Lookup User
      user = await db.models.user.findOne({where: {ident: req.body.user}, attributes: {exclude: ['deletedAt', 'access', 'password', 'jiraToken']}});
    } catch (error) {
      logger.error(`Unable to find user ${error}`);
      return res.status(400).json({error: {message: 'Unable to find user', code: 'failedUserLookupUserProject'}});
    }

    if (!user) {
      return res.status(400).json({error: {message: 'Unable to find the supplied user.', code: 'failedUserLookupUserProject'}});
    }

    let hasBinding;
    try {
      // See if binding already exists
      hasBinding = await db.models.user_project.findOne({paranoid: false, where: {user_id: user.id, project_id: req.project.id, deletedAt: {$ne: null}}});
    } catch (error) {
      logger.error(`Unable to find user binding ${error}`);
      return res.status(400).json({error: {message: 'Unable to find user', code: 'failedUserBindingLookupUserProject'}});
    }

    // exists - set deletedAt to null
    if (hasBinding) {
      try {
        await db.models.user_project.update({deletedAt: null}, {paranoid: false, where: {id: hasBinding.id}, returning: true});
        return res.json(user);
      } catch (error) {
        logger.error(`Unable to restore user project binding ${error}`);
        return res.status(500).json({error: {message: 'Unable to restore existing user project binding', code: 'failedUserProjectRestore'}});
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

      return res.json(output);
    } catch (error) {
      logger.error(`Unable to add user to project ${error}`);
      return res.status(400).json({error: {message: 'Unable to add user to project', code: 'failedUserProjectCreate'}});
    }
  })
  .delete(async (req, res) => {
    // Remove Project User
    // Access Control
    const access = new Acl(req, res);
    access.write = ['admin', 'superUser'];
    if (!access.check()) {
      logger.error('User isn\'t allowed to remove project user');
      return res.status(403).json(ERRORS.AccessForbidden);
    }

    let user;
    try {
      // Lookup User
      user = await db.models.user.findOne({where: {ident: req.body.user}, attributes: {exclude: ['deletedAt', 'access', 'password', 'jiraToken']}});
    } catch (error) {
      logger.error(`Unable to update project ${error}`);
      return res.status(400).json({error: {message: 'Unable to update the specified project', code: 'failedUserLookupUserProject'}});
    }

    if (!user) {
      logger.error('Unable to find the supplied user');
      return res.status(400).json({error: {message: 'Unable to find the supplied user', code: 'failedUserLookupUserProject'}});
    }

    try {
      // Unbind User
      const unboundUser = await db.models.user_project.destroy({where: {project_id: req.project.id, user_id: user.id}});
      if (!unboundUser) {
        logger.error('Unable to remove user from project');
        return res.status(400).json({error: {message: 'Unable to remove user from project', code: 'failedUserProjectDestroy'}});
      }
      return res.status(204).send();
    } catch (error) {
      logger.error(`Unable to remove user from project ${error}`);
      return res.status(400).json({error: {message: 'Unable to remove user from project', code: 'failedGroupMemberRemoveQuery'}});
    }
  });

// POG Binding Functions
router.route('/:project([A-z0-9-]{36})/pog')
  .get((req, res) => {
    // Access Control
    const access = new Acl(req, res);
    access.read = ['admin', 'superUser'];
    if (!access.check()) {
      logger.error('User isn\'t allowed to get project POGs');
      return res.status(403).json(ERRORS.AccessForbidden);
    }

    // Get Project POGs
    return res.json(req.project.pogs);
  })
  .post(async (req, res) => {
    // Add Project POG
    // Access Control
    const access = new Acl(req, res);
    access.write = ['admin', 'superUser', 'Full Project Access'];
    if (access.check()) {
      logger.error('User isn\'t allowed to add project POGs');
      return res.status(403).json(ERRORS.AccessForbidden);
    }

    let pog;
    try {
      // Lookup POG
      pog = await db.models.POG.findOne({where: {ident: req.body.pog}, attributes: {exclude: ['deletedAt', 'access', 'password', 'jiraToken']}});
      if (!pog) {
        logger.error('Unable to find POG file');
        return res.status(400).json({error: {message: 'Unable to find the supplied pog', code: 'failedPOGLookupPOGProject'}});
      }
    } catch (error) {
      logger.error('There was an error while trying to find the POG file');
      return res.status(400).json({error: {message: 'There was an error while trying to find the POG file', code: 'failedPOGLookupPOGProject'}});
    }

    try {
      // Bind POG
      const pogProject = await db.models.pog_project.create({project_id: req.project.id, pog_id: pog.id});
      const output = {
        ident: pog.ident,
        POGID: pog.POGID,
        createdAt: pog.createdAt,
        updatedAt: pog.updatedAt,
        pog_project: {
          updatedAt: pogProject.updatedAt,
          createdAt: pogProject.createdAt,
        },
      };

      return res.json(output);
    } catch (error) {
      logger.error(`Unable to add pog to project ${error}`);
      return res.status(400).json({error: {message: 'Unable to add pog to project', code: 'failedPOGProjectCreateQuery'}});
    }
  })
  .delete(async (req, res) => {
    // Remove Project POG
    // Access Control
    const access = new Acl(req, res);
    access.write = ['admin', 'superUser', 'Full Project Access'];
    if (!access.check()) {
      logger.error('User isn\'t allowed to delete project POGs');
      return res.status(403).json(ERRORS.AccessForbidden);
    }

    let pog;
    try {
      // Lookup POG
      pog = await db.models.POG.findOne({where: {ident: req.body.pog}, attributes: {exclude: ['deletedAt']}});
      if (!pog) {
        logger.error('Unable to find the supplied pog');
        return res.status(400).json({error: {message: 'Unable to find the supplied pog', code: 'failedPOGLookupPOGProject'}});
      }
    } catch (error) {
      logger.error(`Error while trying to find supplied POG ${error}`);
      return res.status(400).json({error: {message: 'Error while trying to find POG file', code: 'failedPOGLookupPOGProject'}});
    }

    try {
      // Unbind POG
      const pogProject = await db.models.pog_project.destroy({where: {project_id: req.project.id, pog_id: pog.id}});
      if (!pogProject) {
        return res.status(400).json({error: {message: 'Unable to remove pog from project', code: 'failedPOGProjectDestroy'}});
      }
      return res.status(204).send();
    } catch (error) {
      logger.error(`Unable to remove pog from project ${error}`);
      return res.status(400).json({error: {message: 'Unable to remove pog from project', code: 'failedGroupMemberRemoveQuery'}});
    }
  });

module.exports = router;
