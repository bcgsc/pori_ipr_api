const _                       = require('lodash');
const db                      = require(process.cwd() + '/app/models');
const MiddlewareNotFound      = require('../../../middleware/exceptions/MiddlewareNotFound');
const MiddlewareQueryFailed   = require('../../../middleware/exceptions/MiddlewareQueryFailed');

// Lookup POG middleware
module.exports = (req,res,next,lookup) => {

  // Lookup POG first
  db.models.tracking_state_task.scope('public').findOne({
    where: {$or: [{ident: lookup}, {name: lookup}]},
    limit: 1,
  }).then(
    (result) => {
      // Nothing found?
      if(result === null) throw new MiddlewareNotFound("Unable to find the tracking state task", req, res, "trackingStateTask");

      // POG found, next()
      if(result !== null) {
        req.task = result;
        next();
      }
    },
    (error) => {
      console.log(error);
      throw new MiddlewareQueryFailed("Unable to looking the requested state task.", req, res, "failedTrackingStateTaskMiddlewareQuery");
    }
  );
};
