const HTTP_STATUS = require('http-status-codes');
const {hasAccessToNonProdReports,
  hasAccessToUnreviewedReports} = require('../../libs/helperFunctions');
const db = require('../../models');
const logger = require('../../log');
const cache = require('../../cache');
const aclMiddleware = require('../acl');

// Middleware for germline reports
module.exports = async (req, res, next, ident) => {
  // Eager loaded germline sections
  const include = [
    {as: 'biofxAssigned', model: db.models.user.scope('public')},
    {as: 'projects', model: db.models.project.scope('public'), through: {attributes: []}},
    {
      as: 'users',
      model: db.models.germlineReportUser,
      attributes: {
        exclude: ['id', 'germlineReportId', 'user_id', 'addedById', 'deletedAt', 'updatedBy'],
      },
      include: [
        {model: db.models.user.scope('public'), as: 'user'},
      ],
    },
    {
      as: 'variants',
      model: db.models.germlineSmallMutationVariant,
      order: [['gene', 'asc']],
      attributes: {exclude: ['id', 'germlineReportId', 'deletedAt', 'updatedBy']},
    },
    {
      as: 'reviews',
      model: db.models.germlineSmallMutationReview,
      attributes: {exclude: ['id', 'germlineReportId', 'reviewerId', 'deletedAt', 'updatedBy']},
      include: [{model: db.models.user.scope('public'), as: 'reviewer'}],
    },
  ];

  // Check cache for germline report
  const key = `/germline/${ident}`;
  let result;

  try {
    result = await cache.get(key);
  } catch (error) {
    logger.error(`Error during germline cache get ${error}`);
  }

  if (result) {
    // Build Sequelize model from cached string without calling db
    result = db.models.germlineSmallMutation.build(JSON.parse(result), {
      raw: true,
      isNewRecord: false,
      include,
    });
  } else {
    try {
      result = await db.models.germlineSmallMutation.findOne({
        where: {ident},
        order: [['createdAt', 'desc']],
        include,
      });
    } catch (error) {
      logger.error(`Error while trying to get germline report ${error}`);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message: 'Error while trying to get germline report'}});
    }

    if (!result) {
      logger.error('Unable to find germline report');
      return res.status(HTTP_STATUS.NOT_FOUND).json({error: {message: 'Unable to find germline report'}});
    }

    if (!hasAccessToNonProdReports(req.user) && result.state === 'nonproduction') {
      logger.error(`User does not have non-production access to ${ident}`);
      return res.status(HTTP_STATUS.FORBIDDEN).json({error: {message: 'User does not have access to Non-Production reports'}});
    }

    if (!hasAccessToUnreviewedReports(req.user) && (result.state !== 'reviewed' && result.state !== 'archived')) {
      logger.error(`User does not have unreviewed access to ${ident}`);
      return res.status(HTTP_STATUS.FORBIDDEN).json({error: {message: 'User does not have access to Unreviewed reports'}});
    }

    // Add result to cache
    cache.set(key, JSON.stringify(result), 'EX', 14400);
  }

  req.report = result;
  return aclMiddleware(req, res, next);
};
