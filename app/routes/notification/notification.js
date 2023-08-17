const HTTP_STATUS = require('http-status-codes');
const express = require('express');

const db = require('../../models');
const logger = require('../../log');

const {getUserProjects, isAdmin} = require('../../libs/helperFunctions');

const router = express.Router({mergeParams: true});

const pairs = {
  user: db.models.user,
  project: db.models.project,
  template: db.models.template,
  user_group: db.models.userGroup,
};

// for each entry in pairs, assumes the key-named value in
// req.body is the ident, and gets the id of the corresponding object.
router.use(async (req, res, next) => {
  const operations = [];

  for (const [key, value] of Object.entries(pairs)) {
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
        req.body[`${key}_id`] = obj.id;
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

router.route('/')
  .get(async (req, res) => {
    let projectAccess = false;

    // if a specific project is named, check if the user has access to it
    const userProjects = await getUserProjects(db.models.project, req.user);
    const projectIdents = userProjects.map((project) => {return project.ident;});

    if (req.body.project_id) {
      if (isAdmin(req.user) || projectIdents.includes(req.body.project)) {
        projectAccess = true;
      }

      if (!projectAccess) {
        logger.error(`user ${req.user.username} does not have access to project ${req.body.project}`);
        return res.status(HTTP_STATUS.FORBIDDEN).json({
          error: {message: `user ${req.user.username} does not have access to project ${req.body.project}`},
        });
      }
    }
    try {
      const whereClause = {
        ...((req.body.user_id == null) ? {} : {user_id: req.body.user_id}),
        ...((req.body.user_group_id == null) ? {} : {user_group_id: req.body.user_group_id}),
        ...((req.body.template_id == null) ? {} : {template_id: req.body.template_id}),
        ...((req.body.project_id == null) ? {} : {project_id: req.body.project_id}),
      };

      let results = await db.models.notification.scope('public').findAll({
        where: whereClause,
      });
      if (!isAdmin(req.user)) {
        results = results.filter((notif) => {return projectIdents.includes(notif.project.ident);});
      }
      return res.json(results);
    } catch (error) {
      logger.error(`${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Problem getting notification'},
      });
    }
  })
  .post(async (req, res) => {
    if (req.body.user_id && req.body.user_group_id) {
      return res.status(HTTP_STATUS.CONFLICT).json({
        error: {message: 'Only one of user and user group should be specified'},
      });
    }

    if (!req.body.user_id && !req.body.user_group_id) {
      return res.status(HTTP_STATUS.CONFLICT).json({
        error: {message: 'Exactly one of user and user group should be specified'},
      });
    }

    if (!req.body.project_id) {
      return res.status(HTTP_STATUS.CONFLICT).json({
        error: {message: 'Project must be specified'},
      });
    }

    if (!req.body.template_id) {
      return res.status(HTTP_STATUS.CONFLICT).json({
        error: {message: 'Template must be specified'},
      });
    }

    if (!req.body.event_type) {
      return res.status(HTTP_STATUS.CONFLICT).json({
        error: {message: 'Event type must be specified'},
      });
    }

    // check the given user, if any, is bound to the given project (or is admin)
    if (req.body.user_id) {
      let notifUser;
      try {
        notifUser = await db.models.user.findOne({
          where: {id: req.body.user_id},
          include: [
            'groups',
          ],
        });
      } catch (error) {
        logger.error(`Error while trying to find user groups ${error}`);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
          error: {message: 'Error while trying to find user groups'},
        });
      }
      if (!isAdmin(notifUser)) {
        let projectBinding;
        try {
          projectBinding = await db.models.userProject.findOne({
            where: {user_id: req.body.user_id, project_id: req.body.project_id},
          });
        } catch (error) {
          logger.error(`Error while trying to find user-project binding ${error}`);
          return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            error: {message: 'Error while trying to find user-project binding'},
          });
        }

        if (!projectBinding) {
          logger.error(`User ${req.body.user} is not bound to project ${req.body.project} and can not receive notifications for it`);
          return res.status(HTTP_STATUS.CONFLICT).json({
            error: {message: 'User is not bound to project and can not receive updates for it'},
          });
        }
      }
    }

    try {
      const newnotif = await db.models.notification.create({
        projectId: req.body.project_id, userId: req.body.user_id ? req.body.user_id : null, userGroupId: req.body.user_group_id ? req.body.user_group_id : null, eventType: req.body.event_type, templateId: req.body.template_id,
      });

      // Load new notif with associations
      const result = await db.models.notification.scope('public').findOne({
        where: {id: newnotif.id},
      });

      return res.status(HTTP_STATUS.CREATED).json(result);
    } catch (error) {
      logger.error(`Error while creating notification ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Error while creating notification '},
      });
    }
  })
  .delete(async (req, res) => {
    let notification;
    try {
      notification = await db.models.notification.findOne({
        where: {ident: req.body.ident},
        attributes: ['id', 'ident'],
      });
    } catch (error) {
      logger.error(`Error while trying to find notification ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Error while trying to find notification'},
      });
    }

    if (!notification) {
      logger.error(`Unable to find notification ${req.body.user}`);
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        error: {message: 'Unable to find the provided notification'},
      });
    }

    try {
      await notification.destroy();
      return res.status(HTTP_STATUS.NO_CONTENT).send();
    } catch (error) {
      logger.error(`Error while deleting notification ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Error while deleting notification'},
      });
    }
  });
module.exports = router;
