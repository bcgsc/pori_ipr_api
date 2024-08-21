const HTTP_STATUS = require('http-status-codes');
const db = require('../models');
const logger = require('../log');

// Middleware for user groups
module.exports = async (req, res, next, ident) => {
  let result;
  try {
    result = await db.models.userGroup.findOne({
      where: {ident},
      include: [
        {as: 'users', model: db.models.user, attributes: {exclude: ['id', 'deletedAt', 'password', 'updatedBy']}},
      ],
    });
  } catch (error) {
    logger.error(`Error while looking up user group ${error}`);
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      error: {message: 'Error while looking up user group'},
    });
  }

  if (!result) {
    logger.error(`Unable to find group ${ident}`);
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      error: {message: 'Unable to find group'},
    });
  }

  req.group = result;
  return next();
};
