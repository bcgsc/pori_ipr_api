const HTTP_STATUS = require('http-status-codes');
const db = require('../models');
const logger = require('../log');

const {getUserProjects} = require('../libs/helperFunctions');

module.exports = async (req, res, next, ident) => {
  // Get the projects the user has access to
  let projectAccess;
  try {
    projectAccess = await getUserProjects(db.models.project, req.user);
  } catch (error) {
    logger.error(`Error while getting user's access to projects ${error}`);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: {message: 'Error while getting user\'s access to projects'},
    });
  }

  // See if user has access to project
  const hasAccess = projectAccess.some((project) => {
    return project.ident === ident;
  });

  if (!hasAccess) {
    logger.error(`User ${req.user.username} doesn't have access to project ${ident}`);
    return res.status(HTTP_STATUS.FORBIDDEN).json({
      error: {message: 'You do not have access to this project'},
    });
  }

  let result;
  try {
    result = await db.models.project.findOne({
      where: {ident},
      include: [
        {
          as: 'users',
          model: db.models.user,
          attributes: {exclude: ['id', 'deletedAt', 'password', 'updatedBy']},
          through: {attributes: []},
        },
        {
          as: 'reports',
          model: db.models.report,
          attributes: ['ident', 'patientId', 'alternateIdentifier', 'createdAt', 'updatedAt'],
          through: {attributes: []},
        },
      ],
    });
  } catch (error) {
    logger.error(`Error while trying to find project ${error}`);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: {message: 'Error while trying to find project'},
    });
  }

  if (!result) {
    logger.error(`Unable to find project ${ident}`);
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      error: {message: 'Unable to find project'},
    });
  }

  req.project = result;
  return next();
};
