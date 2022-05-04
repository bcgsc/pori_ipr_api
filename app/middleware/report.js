const HTTP_STATUS = require('http-status-codes');
const db = require('../models');
const logger = require('../log');
const cache = require('../cache');
const aclMiddleware = require('./acl');

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
      attributes: ['ident', 'name'],
      through: {attributes: []},
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

  // Check cache for report
  const key = `/reports/${ident}`;
  let result;

  try {
    result = await cache.get(key);
  } catch (error) {
    logger.error(`Error during report cache get ${error}`);
  }

  if (result) {
    // Build Sequelize model from cached string without calling db
    result = db.models.report.build(JSON.parse(result), {
      raw: true,
      isNewRecord: false,
      include,
    });
  } else {
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

    // Add result to cache
    cache.set(key, JSON.stringify(result), 'EX', 14400);
  }

  // Add report to request
  req.report = result;
  return aclMiddleware(req, res, next);
};
