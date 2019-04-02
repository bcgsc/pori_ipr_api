const db = require('../../../models');
const MiddlewareNotFound = require('../../../middleware/exceptions/MiddlewareNotFound');
const MiddlewareQueryFailed = require('../../../middleware/exceptions/MiddlewareQueryFailed');

const {logger} = process;

// Lookup POG middleware
module.exports = async (req, res, next, ident) => {
  const opts = {
    where: {
      ident,
    },
    attributes: {
      exclude: ['deletedAt', 'reviewedBy_id', 'germline_report_id'],
    },
  };

  try {
    const result = await db.models.germline_small_mutation_review.scope('public').findOne(opts);
    if (!result) {
      throw new MiddlewareNotFound('Unable to find the germline report review', req, res, 'germlineReportReview');
    }
    req.review = result;
    return next();
  } catch (error) {
    logger.error(error);
    throw new MiddlewareQueryFailed('Unable to find the requested germline report review.', req, res, 'failedTrackingStateTaskMiddlewareQuery');
  }
};
