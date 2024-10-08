const HTTP_STATUS = require('http-status-codes');
const db = require('../models');
const logger = require('../log');

// Middleware for user groups
module.exports = async (req, res, next, group) => {
  let result;
  try {
    result = await db.models.user.scope('public').findAll({
      include: [
        {as: 'groups', model: db.models.userGroup, attributes: [], where: {name: group}},
      ],
    });
  } catch (error) {
    logger.error(`Error while looking up user group ${error}`);
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: {message: 'Error while looking up user group'},
    });
  }

  if (!result) {
    logger.error(`Unable to find group ${group}`);
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      error: {message: 'Unable to find group'},
    });
  }

  req.group = {name: group, users: result};
  return next();
};
