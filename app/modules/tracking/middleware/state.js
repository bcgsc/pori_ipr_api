const validate = require('uuid-validate');
const db = require('../../../models');
const MiddlewareNotFound = require('../../../middleware/exceptions/MiddlewareNotFound');
const MiddlewareQueryFailed = require('../../../middleware/exceptions/MiddlewareQueryFailed');

const logger = require('../../../../lib/log');

// Lookup POG middleware
module.exports = async (req, res, next, ident) => {
  const opts = {
    where: {},
    attributes: {exclude: ['deletedAt']},
    limit: 1,
    include: [
      {as: 'analysis', model: db.models.pog_analysis.scope('public')},
      {
        as: 'tasks',
        model: db.models.tracking_state_task,
        order: [['ordinal', 'ASC']],
        include: [
          {as: 'assignedTo', model: db.models.user.scope('public')},
          {
            as: 'checkins',
            model: db.models.tracking_state_task_checkin,
            include: [{as: 'user', model: db.models.user.scope('public')}],
          },
        ],
      },
    ],
  };

  if (req.analysis) {
    opts.where.analysis_id = req.analysis.id;
  }

  // Check if it's a UUID
  if (validate(ident)) {
    opts.where.ident = ident;
  } else {
    opts.where.slug = ident;
  }

  let trackingState;
  try {
    trackingState = await db.models.tracking_state.findOne(opts);
  } catch (error) {
    logger.error(`Error while finding tracking state with ident: ${ident} error: ${error}`);
    throw new MiddlewareQueryFailed('Error while finding tracking state', req, res, 'failedTrackingStateMiddlewareQuery');
  }

  if (!trackingState) {
    logger.error(`Unable to find the tracking state with ident: ${ident}`);
    throw new MiddlewareNotFound('Unable to find the tracking state', req, res, 'trackingState');
  }

  req.state = trackingState;
  return next();
};
