const HTTP_STATUS = require('http-status-codes');
const express = require('express');
const {Op} = require('sequelize');

const db = require('../../models');
const logger = require('../../log');

const {getUserProjects} = require('../../libs/helperFunctions');

const router = express.Router({mergeParams: true});

// Project Search
router.route('/')
  .get(async (req, res) => {
    const {query} = req.query;
    // Check user permission and filter by project
    let projectAccess;
    try {
      projectAccess = await getUserProjects(db.models.project, req.user);
    } catch (error) {
      logger.error(`Error while getting user's access to projects ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Error while getting user\'s access to projects'},
      });
    }

    // Get the ident's of the projects the user has access to
    const projectIdents = projectAccess.map((project) => {
      return project.ident;
    });

    let projects;
    try {
      projects = await db.models.project.scope('public').findAll({
        where: {
          ident: projectIdents,
          name: {[Op.iLike]: `%${query}%`},
        },
      });
      return res.json(projects);
    } catch (error) {
      logger.error(`Error while trying to find projects ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Error while trying to find projects'},
      });
    }
  });

module.exports = router;
