const HTTP_STATUS = require('http-status-codes');
const express = require('express');

const db = require('../../models');
const logger = require('../../log');

const router = express.Router({mergeParams: true});

router.route('/')
  .get(async (req, res) => {
    user_group_ident = req.body.user_group;
    project_ident = req.body.project;

    if (!user_group_ident && !project_ident) {
      logger.error('One of userGroup or project must be specified');
      return res.status(HTTP_STATUS.NOT_FOUND).json({error: {message: 'Must specify user or project'}});
    }

    let userGroup;
    if (user_group_ident) {
      userGroup = await db.models.userGroup.findOne({
        where: {ident: req.body.user_group},
      });
      if (user_group_ident && !userGroup) {
        logger.error(`Unable to find userGroup ${req.body.user_group}`);
        return res.status(HTTP_STATUS.NOT_FOUND).json({error: {message: 'Unable to find user'}});
      }
    }

    let project;
    if (project_ident) {
      project = await db.models.project.findOne({
        where: {ident: req.body.project},
      });
      if (project_ident && !project) {
        logger.error(`Unable to find project ${req.body.project}`);
        return res.status(HTTP_STATUS.NOT_FOUND).json({error: {message: 'Unable to find project'}});
      }
    }

    let results;
    if (project && userGroup) {
      results = await db.models.projectUserGroupNotification.findAll({
        where: {project_id: project.id, user_group_id: userGroup.id},
      });
    }
    if (project && !userGroup) {
      results = await db.models.projectUserGroupNotification.findAll({
        where: {project_id: project.id},
      });
    }
    if (!project && userGroup) {
      results = await db.models.projectUserGroupNotification.findAll({
        where: {user_group_id: userGroup.id},
      });
    }
    return res.json(results);
  })
  .post(async (req, res) => {
    let project;
    try {
      project = await db.models.project.findOne({
        where: {ident: req.body.project},
      });
    } catch (error) {
      logger.error(`Error while trying to find project ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Error while trying to find project'},
      });
    }

    if (!project) {
      logger.error(`Unable to find project ${req.body.project}`);
      return res.status(HTTP_STATUS.NOT_FOUND).json({error: {message: 'Unable to find project'}});
    }
    let userGroup;
    try {
      userGroup = await db.models.userGroup.findOne({
        where: {ident: req.body.user_group},
      });
    } catch (error) {
      logger.error(`Error while trying to find user group ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Error while trying to find user group'},
      });
    }
    if (!userGroup) {
      logger.error(`Unable to find user group ${req.body.user_group}`);
      return res.status(HTTP_STATUS.NOT_FOUND).json({error: {message: 'Unable to find user group'}});
    }

    if (req.body.template) {
      try {
        template = await db.models.template.findOne({
          where: {ident: req.body.template},
        });
      } catch (error) {
        logger.error(`Error while trying to find template ${template}`);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
          error: {message: 'Error while trying to find template'},
        });
      }
    }
    if (req.body.template && !template) {
      logger.error(`Unable to find template ${req.body.template}`);
      return res.status(HTTP_STATUS.NOT_FOUND).json({error: {message: 'Unable to find template'}});
    }

    try {
      const result = await db.models.projectUserGroupNotification.create({
        projectId: project.id, userGroupId: userGroup.id, eventType: req.body.event_type, templateId: template.id,
      });
      const output = {
        ident: result.ident,
        userGroup: userGroup.name,
        project: project.name,
        template: template.name,
        eventType: req.body.event_type,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
      };

      return res.status(HTTP_STATUS.CREATED).json(output);
    } catch (error) {
      logger.error(`Error while setting user group notification for project ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Error while setting user group notification status'},
      });
    }
  })
  .delete(async (req, res) => {
    let projectUserGroupNotification;
    try {
      projectUserGroupNotification = await db.models.projectUserGroupNotification.findOne({
        where: {ident: req.body.ident},
        attributes: ['id', 'ident'],
      });
    } catch (error) {
      logger.error(`Error while trying to find project user notification ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Error while trying to find project user notification'},
      });
    }

    if (!projectUserGroupNotification) {
      logger.error(`Unable to find project user group notification ${req.body.userGroup}`);
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        error: {message: 'Unable to find the provided project user group notification'},
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
