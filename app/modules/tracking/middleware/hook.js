const _                   = require('lodash');
const db                  = require(process.cwd() + '/app/models');
const MiddlewareNotFound  = require('../../../middleware/exceptions/MiddlewareNotFound');
const MiddlewareQueryFailed  = require('../../../middleware/exceptions/MiddlewareQueryFailed');

// Lookup POG middleware
module.exports = (req,res,next,ident) => {

  let opts = { where: {} };
  
  // Check if it's a UUID
  opts.where.ident = ident;

  opts.attributes = {exclude: ['deletedAt']};
  opts.limit = 1;

  // Lookup POG first
  db.models.tracking_hook.findOne(opts).then(
    (result) => {
      // Nothing found?
      if(result === null) throw new MiddlewareNotFound("Unable to find the tracking hook", req, res, "trackingHook");

      // POG found, next()
      if(result !== null) {
        req.hook = result;
        next();
      }
    },
    (error) => {
      console.log(error);
      throw new MiddlewareQueryFailed("Unable to looking the requested state.", req, res, "failedTrackingHookMiddlewareQuery");
    }
  );
};
