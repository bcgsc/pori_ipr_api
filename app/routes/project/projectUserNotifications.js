const HTTP_STATUS = require('http-status-codes');
const express = require('express');

const db = require('../../models');
const logger = require('../../log');

const router = express.Router({ mergeParams: true });

router.route('/')
  .get(async (req, res) => {
    results = await db.models.projectUserNotification.findAll({
      where: { project_id: req.project.id }
    });
    return res.json(results);
  })
  .post(async (req, res) => {
    let user;
    try {
      user = await db.models.user.findOne({
        where: { ident: req.body.user },
      });
    } catch (error) {
      logger.error(`Error while trying to find user ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: { message: 'Error while trying to find user' },
      });
    }

    if (!user) {
      logger.error(`Unable to find user ${req.body.user}`);
      return res.status(HTTP_STATUS.NOT_FOUND).json({ error: { message: 'Unable to find user' } });
    }

    if (req.body.template) {
      try {
        template = await db.models.template.findOne({
          where: { ident: req.body.template },
        });
      } catch (error) {
        logger.error(`Error while trying to find template ${template}`);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
          error: { message: 'Error while trying to find template' },
        });
      }
    }

    if (req.body.template && !template) {
      logger.error(`Unable to find template ${req.body.template}`);
      return res.status(HTTP_STATUS.NOT_FOUND).json({ error: { message: 'Unable to find template' } });
    }

    let projectBinding;
    try {
      projectBinding = await db.models.userProject.findOne({
        where: { user_id: user.id, project_id: req.project.id },
      });
    } catch (error) {
      logger.error(`Error while trying to find user-project binding ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: { message: 'Error while trying to find user-project binding' },
      });
    }

    if (!projectBinding) {
      logger.error(`User ${user.ident} is not bound to project ${req.project.name} and can not receive notifications for it`);
      return res.status(HTTP_STATUS.CONFLICT).json({
        error: { message: 'User is not bound to project and can not receive updates for it' },
      });
    }

    try {
      const result = await db.models.projectUserNotification.create({
        projectId: req.project.id, userId: user.id, eventType: req.body.event_type, templateId: template.id
      });

      const output = {
        ident: result.ident,
        user: user.username,
        project: req.project.name,
        template: template.name,
        eventType: req.body.event_type,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
      };

      return res.status(HTTP_STATUS.CREATED).json(output);
    } catch (error) {
      logger.error(`Error while setting user notification for project ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: { message: 'Error while setting user notification status' },
      });
    }
  })
  .delete(async (req, res) => {
    let projectUserNotification;
    try {
      projectUserNotification = await db.models.projectUserNotification.findOne({
        where: { ident: req.body.ident },
        attributes: ['id', 'ident'],
      });
    } catch (error) {
      logger.error(`Error while trying to find project user notification ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: { message: 'Error while trying to find project user notification' },
      });
    }

    if (!projectUserNotification) {
      logger.error(`Unable to find project user notification ${req.body.user}`);
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        error: { message: 'Unable to find the provided project user notification' },
      });
    }

    try {
      await projectUserNotification.destroy();
      return res.status(HTTP_STATUS.NO_CONTENT).send();
    } catch (error) {
      logger.error(`Error while deleting project user notification ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Error while deleting project user notification'},
      });
    }

  });

module.exports = router;
