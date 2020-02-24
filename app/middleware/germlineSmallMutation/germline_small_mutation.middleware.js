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
    logger.error('Unable to find the requested germline report.');
    res.status(HTTP_STATUS.NOT_FOUND).json({error: 'Unable to find the requested germline report.'});
  }
};
