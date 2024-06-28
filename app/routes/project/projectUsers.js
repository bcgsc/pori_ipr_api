const HTTP_STATUS = require('http-status-codes');
const express = require('express');

const db = require('../../models');
const logger = require('../../log');

const {isAdmin} = require('../../libs/helperFunctions');

const router = express.Router({mergeParams: true});

// User-project binding routes
router.route('/')
  .get((req, res) => {
    return res.json(req.project.users);
  })
  .post(async (req, res) => {
    let user;
    try {
      user = await db.models.user.findOne({
        where: {ident: req.body.user},
        attributes: {exclude: ['deletedAt', 'password', 'updatedBy']},
      });
    } catch (error) {
      logger.error(`Error while trying to find user ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Error while trying to find user'},
      });
    }

    if (!user) {
      logger.error(`Unable to find user ${req.body.user}`);
      return res.status(HTTP_STATUS.NOT_FOUND).json({error: {message: 'Unable to find user'}});
    }

    if (!isAdmin(req.user) && !(req.user.projects).map((proj) => {return proj.name;}).includes(req.project.name)) {
      const msg = 'User does not have permission to add other users to this group';
      logger.error(msg);
      return res.status(HTTP_STATUS.FORBIDDEN).json({error: {message: msg}});
    }

    let binding;
    try {
      binding = await db.models.userProject.findOne({
        where: {user_id: user.id, project_id: req.project.id},
      });
    } catch (error) {
      logger.error(`Error while trying to find user-project binding ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Error while trying to find user-project binding'},
      });
    }

    if (binding) {
      logger.error(`User ${user.ident} is already bound to project ${req.project.name}`);
      return res.status(HTTP_STATUS.CONFLICT).json({
        error: {message: 'User is already bound to this project'},
      });
    }

    try {
      const result = await db.models.userProject.create({
        project_id: req.project.id, user_id: user.id,
      });

      const output = {
        user: user.username,
        project: req.project.name,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
      };

      return res.status(HTTP_STATUS.CREATED).json(output);
    } catch (error) {
      logger.error(`Error while binding user to project ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Error while binding user to project'},
      });
    }
  })
  .delete(async (req, res) => {
    let user;
    try {
      user = await db.models.user.findOne({
        where: {ident: req.body.user},
        attributes: ['id', 'ident'],
      });
    } catch (error) {
      logger.error(`Error while trying to find user ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Error while trying to find user'},
      });
    }

    if (!user) {
      logger.error(`Unable to find user ${req.body.user}`);
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        error: {message: 'Unable to find the provided user'},
      });
    }

    if (!isAdmin(req.user) && !(req.user.projects).map((proj) => {return proj.name;}).includes(req.project.name)) {
      const msg = 'User does not have permission to remove other users from this group';
      logger.error(msg);
      return res.status(HTTP_STATUS.FORBIDDEN).json({error: {message: msg}});
    }

    try {
      // Find user binding
      const binding = await db.models.userProject.findOne({
        where: {project_id: req.project.id, user_id: user.id},
      });

      if (!binding) {
        logger.error('User is not bound to project');
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          error: {message: 'User is not bound to project'},
        });
      }

      // Remove user binding
      await binding.destroy();
      return res.status(HTTP_STATUS.NO_CONTENT).send();
    } catch (error) {
      logger.error(`Error while removing user from project ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Error while removing user from project'},
      });
    }
  });

module.exports = router;
