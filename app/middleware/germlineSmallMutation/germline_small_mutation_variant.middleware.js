const HTTP_STATUS = require('http-status-codes');
const db = require('../../models');
const MiddlewareNotFound = require('../exceptions/MiddlewareNotFound');

const logger = require('../../log');

// Lookup POG middleware
module.exports = async (req, res, next, ident) => {
  const opts = {
    where: {
      ident,
    },
  };

  try {
    const result = await db.models.germline_small_mutation_variant.scope('public').findOne(opts);
    if (!result) {
      throw new MiddlewareNotFound('Unable to find the germline report variant', req, res, 'germlineReportVariant');
    }
    req.variant = result;
    return next();
  } catch (error) {
    logger.error(error);
    return res.status(HTTP_STATUS.NOT_FOUND).json({error: 'Unable to find the requested germline report.'});
  }
};