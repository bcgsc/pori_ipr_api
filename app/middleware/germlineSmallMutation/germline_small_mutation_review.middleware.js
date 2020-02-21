const db = require('../../models');
const MiddlewareNotFound = require('../exceptions/MiddlewareNotFound');

const logger = require('../../log');

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
    logger.error('Unable to find the requested germline report.');
    res.status(404).json({error: 'Unable to find the requested germline report.'});
  }
};
