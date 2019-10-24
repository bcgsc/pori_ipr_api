const db = require('../../../models');
const MiddlewareNotFound = require('../../../middleware/exceptions/MiddlewareNotFound');
const MiddlewareQueryFailed = require('../../../middleware/exceptions/MiddlewareQueryFailed');

const logger = require('../../../log');

// Lookup POG middleware
module.exports = async (req, res, next, ident) => {
  let trackingStateDef;
  try {
    trackingStateDef = await db.models.tracking_state_definition.scope('public').findOne({
      where: {ident},
      limit: 1,
    });
  } catch (error) {
    logger.error(`Error while finding tracking state definition with ident: ${ident} error: ${error}`);
    throw new MiddlewareQueryFailed('Error while finding tracking state definition', req, res, 'failedTrackingStateDefinitionMiddlewareQuery');
  }

  if (!trackingStateDef) {
    logger.error(`Unable to find tracking state definition with ident: ${ident}`);
    throw new MiddlewareNotFound('Unable to find the tracking state definition', req, res, 'trackingStateDefinitionNotFound');
  }

  req.definition = trackingStateDef;
  return next();
};
