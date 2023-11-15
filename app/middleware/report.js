const HTTP_STATUS = require('http-status-codes');
const db = require('../models');
const logger = require('../log');
const aclMiddleware = require('./acl');
const {hasAccessToNonProdReports} = require('../libs/helperFunctions');

// Lookup report middleware
module.exports = async (req, res, next, ident) => {
  // Eager loaded report sections
  const include = [
    {model: db.models.patientInformation.scope('public'), as: 'patientInformation'},
    {model: db.models.user.scope('public'), as: 'createdBy'},
    {model: db.models.template.scope('minimal'), as: 'template'},
    {
      model: db.models.project,
      as: 'projects',
      attributes: {exclude: ['id', 'deletedAt', 'updatedBy']},
      through: {attributes: ['additionalProject']},
    },
    {
      model: db.models.reportUser,
      as: 'users',
      separate: true,
      attributes: {exclude: ['id', 'reportId', 'user_id', 'addedBy_id', 'deletedAt', 'updatedBy']},
      include: [
        {model: db.models.user.scope('public'), as: 'user'},
      ],
    },
  ];

  let result;

  try {
    result = await db.models.report.findOne({
      where: {ident},
      attributes: {exclude: ['config']},
      include,
    });
  } catch (error) {
    logger.error(`Error while trying to get report: ${ident} ${error}`);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Error while trying to get report'}});
  }

  // Nothing found?
  if (!result) {
    logger.error(`Unable to find the requested report ${ident}`);
    return res.status(HTTP_STATUS.NOT_FOUND).json({error: {message: 'Unable to find the requested report'}});
  }

  if (!hasAccessToNonProdReports(req.user) && result.state === 'nonproduction') {
    logger.error(`User does not have non-production access to ${ident}`);
    return res.status(HTTP_STATUS.FORBIDDEN).json({error: {message: 'User does not have access to Non-Production reports'}});
  }

  // Add report to request
  req.report = result;
  return aclMiddleware(req, res, next);
};
