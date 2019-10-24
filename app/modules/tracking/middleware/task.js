const validate = require('uuid-validate');
const db = require('../../../models');
const MiddlewareNotFound = require('../../../middleware/exceptions/MiddlewareNotFound');
const MiddlewareQueryFailed = require('../../../middleware/exceptions/MiddlewareQueryFailed');

const logger = require('../../../log');

// Lookup POG middleware
module.exports = async (req, res, next, ident) => {
  const opts = {
    where: {},
    attributes: {exclude: ['deletedAt']},
    limit: 1,
    order: [['ordinal', 'ASC']],
    include: [
      {as: 'state', model: db.models.tracking_state.scope('noTasks')},
      {as: 'assignedTo', model: db.models.user.scope('public')},
      {as: 'checkins', model: db.models.tracking_state_task_checkin, separate: true, include:
        [
          {as: 'user', model: db.models.user.scope('public')},
        ],
      },
    ],
  };

  if (req.state) {
    opts.where.state_id = req.state.id;
  }

  // Check if it's a UUID
  if (validate(ident)) {
    opts.where.ident = ident;
  } else {
    if (!req.state) {
      logger.error('Lookup by task slug requires parent state to be specified');
      throw new MiddlewareQueryFailed('Lookup by task slug requires parent state to be specified');
    }
    opts.where.slug = ident;
  }

  let trackingStateTask;
  try {
    trackingStateTask = await db.models.tracking_state_task.findOne(opts);
  } catch (error) {
    logger.error(`Error while trying to find tracking state task with ident: ${ident} error: ${error}`);
    throw new MiddlewareQueryFailed('Error while trying to find tracking state task', req, res, 'failedTrackingStateTaskMiddlewareQuery');
  }

  if (!trackingStateTask) {
    logger.error(`Unable to find the tracking state task with ident ${ident}`);
    throw new MiddlewareNotFound('Unable to find the tracking state task', req, res, 'trackingStateTask');
  }

  req.task = trackingStateTask;
  return next();
};
