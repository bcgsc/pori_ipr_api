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
    limit: 1,
    attributes: {exclude: ['deletedAt']},
  };

  let trackingHook;
  try {
    trackingHook = await db.models.tracking_hook.findOne(opts);
  } catch (error) {
    logger.error(`Error while looking up tracking hook ${error}`);
    throw new MiddlewareQueryFailed('Error while looking up tracking hook', req, res, 'failedTrackingHookMiddlewareQuery');
  }

  if (!trackingHook) {
    logger.error('Unable to find the tracking hook');
    throw new MiddlewareNotFound('Unable to find the tracking hook', req, res, 'trackingHook');
  }

  req.hook = trackingHook;
  return next();
};
