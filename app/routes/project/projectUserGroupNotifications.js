const HTTP_STATUS = require('http-status-codes');
const express = require('express');

const db = require('../../models');
const logger = require('../../log');

const router = express.Router({ mergeParams: true });

router.route('/')
  .get(async (req, res) => {
    results = await db.models.projectUserGroupNotification.findAll({
      where: { project_id: req.project.id }
    });
    return res.json(results);
  })
  .post(async (req, res) => {
    let userGroup;
    try {
      userGroup = await db.models.userGroup.findOne({
        where: { ident: req.body.userGroup },
      });
    } catch (error) {
      logger.error(`Error while trying to find user group ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: { message: 'Error while trying to find user group' },
      });
    }

    if (!userGroup) {
      logger.error(`Unable to find user group ${req.body.userGroup}`);
      return res.status(HTTP_STATUS.NOT_FOUND).json({ error: { message: 'Unable to find user group' } });
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

    try {
      const result = await db.models.projectUserNotification.create({
        projectId: req.project.id, userGroupId: userGroup.id, eventType: req.body.event_type, templateId: template.id
      });

      const output = {
        ident: result.ident,
        userGroup: userGroup.name,
        project: req.project.name,
        template: template.name,
        eventType: req.body.event_type,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
      };

      return res.status(HTTP_STATUS.CREATED).json(output);
    } catch (error) {
      logger.error(`Error while setting user group notification for project ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: { message: 'Error while setting user group notification status' },
      });
    }
  })
  .delete(async (req, res) => {
    let projectUserGroupNotification;
    try {
      projectUserGroupNotification = await db.models.projectUserGroupNotification.findOne({
        where: { ident: req.body.ident},
        attributes: ['id', 'ident'],
      });
    } catch (error) {
      logger.error(`Error while trying to find project user notification ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: { message: 'Error while trying to find project user notification' },
      });
    }

    if (!projectUserNotification) {
      logger.error(`Unable to find project user group notification ${req.body.userGroup}`);
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        error: { message: 'Unable to find the provided project user group notification' },
      });
    }

    try {

      await projectUserGroupNotification.destroy();
      return res.status(HTTP_STATUS.NO_CONTENT).send();
    } catch (error) {
      logger.error(`Error while deleting project user group notification ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Error while deleting project user group notification'},
      });
    }

  });

module.exports = router;
