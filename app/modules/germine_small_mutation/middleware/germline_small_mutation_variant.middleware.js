const db = require('../../../models');
const MiddlewareNotFound = require('../../../middleware/exceptions/MiddlewareNotFound');
const MiddlewareQueryFailed = require('../../../middleware/exceptions/MiddlewareQueryFailed');

const logger = require('../../../log');

// Lookup POG middleware
module.exports = async (req, res, next, ident) => {
  const opts = {
    where: {
      ident,
    },
    attributes: {
      exclude: ['deletedAt', 'germline_report_id'],
    },
  };

  try {
    const variantModel = db.models.germline_small_mutation_variant.scope('public');
    const result = await variantModel.bind(variantModel).findOne(opts);
    if (!result) {
      throw new MiddlewareNotFound('Unable to find the germline report variant', req, res, 'germlineReportVariant');
    }
    req.variant = result;
    return next();
  } catch (error) {
    logger.error(error);
    throw new MiddlewareQueryFailed('Unable to find the requested germline report variant.', req, res, 'failedTrackingStateTaskMiddlewareQuery');
  }
};
