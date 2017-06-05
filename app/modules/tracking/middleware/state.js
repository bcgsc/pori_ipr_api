const _                   = require('lodash');
const db                  = require(process.cwd() + '/app/models');
const MiddlewareNotFound  = require('../../../middleware/exceptions/MiddlewareNotFound');
const MiddlewareQueryFailed  = require('../../../middleware/exceptions/MiddlewareQueryFailed');

// Lookup POG middleware
module.exports = (req,res,next,ident) => {

  // Lookup POG first
  db.models.tracking_state.findOne({
    where: {ident: ident},
    attributes: {exclude: ['deletedAt']},
    limit: 1,
    include: [
      {as: 'tasks', model: db.models.tracking_state_task.scope('public'), attributes: {exclude: ['id', 'state_id', 'assignedTo_id']}}
    ],
  }).then(
    (result) => {
      // Nothing found?
      if(result === null) throw new MiddlewareNotFound("Unable to find the tracking state", req, res, "trackingState");

      // POG found, next()
      if(result !== null) {
        req.state = result;
        next();
      }
    },
    (error) => {
      console.log(error);
      throw new MiddlewareQueryFailed("Unable to looking the requested state.", req, res, "failedTrackingStateMiddlewareQuery");
    }
  );
};
