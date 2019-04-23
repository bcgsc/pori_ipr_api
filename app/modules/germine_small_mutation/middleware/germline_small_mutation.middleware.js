const db = require('../../../models');
const MiddlewareNotFound = require('../../../middleware/exceptions/MiddlewareNotFound');
const MiddlewareQueryFailed = require('../../../middleware/exceptions/MiddlewareQueryFailed');

const logger = require('../../../../lib/log');

// Lookup POG middleware
module.exports = async (req, res, next, ident) => {
  const opts = {
    where: {
      ident,
    },
    attributes: {
      exclude: ['deletedAt'],
    },
  };

  try {
    const result = await db.models.germline_small_mutation.scope('public').findOne(opts);
    if (!result) {
      throw new MiddlewareNotFound('Unable to find the germline report', req, res, 'germlineReport');
    }
    req.report = result;
    return next();
  } catch (error) {
    logger.error(error);
    throw new MiddlewareQueryFailed('Unable to find the requested germline report.', req, res, 'failedTrackingStateTaskMiddlewareQuery');
  }
};
