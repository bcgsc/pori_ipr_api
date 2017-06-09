const _                   = require('lodash');
const db                  = require(process.cwd() + '/app/models');
const MiddlewareNotFound  = require('../../../middleware/exceptions/MiddlewareNotFound');
const MiddlewareQueryFailed  = require('../../../middleware/exceptions/MiddlewareQueryFailed');

// Lookup POG middleware
module.exports = (req,res,next,ident) => {

  let opts = { where: {} };

  if(req.analysis) opts.where.analysis_id = req.analysis.id;

  // Check if it's a UUID
  if(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(ident)) opts.where.ident = ident;
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(ident)) opts.where.slug = ident;

  /*opts.where = {
    $or: [
      {ident: ident},
      {slug: ident}
    ]
  };*/

  opts.attributes = {exclude: ['deletedAt']};
  opts.limit = 1;
  opts.include = [
    {as: 'tasks', model: db.models.tracking_state_task.scope('public'), attributes: {exclude: ['id', 'state_id', 'assignedTo_id']}}
  ];


  // Lookup POG first
  db.models.tracking_state.findOne(opts).then(
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
