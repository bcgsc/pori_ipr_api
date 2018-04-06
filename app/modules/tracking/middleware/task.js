const _                       = require('lodash');
const db                      = require(process.cwd() + '/app/models');
const MiddlewareNotFound      = require('../../../middleware/exceptions/MiddlewareNotFound');
const MiddlewareQueryFailed   = require('../../../middleware/exceptions/MiddlewareQueryFailed');

// Lookup POG middleware
module.exports = (req,res,next,lookup) => {

  let opts = { where: {} };

  opts.attributes = {
    exclude: ['deletedAt']
  };
  if(req.state) opts.where.state_id = req.state.id;

  // Check if it's a UUID
  if(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(lookup)) opts.where.ident = lookup;
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(lookup)) {
    if(!req.state) throw new MiddlewareQueryFailed('Lookup by task slug requires parent state to be specified');
    opts.where.slug = lookup;
  }

  opts.limit = 1;
  opts.order = 'ordinal ASC';

  opts.include = [
    {as: 'state', model: db.models.tracking_state.scope('noTasks'), },
    {as: 'assignedTo', model: db.models.user.scope('public')},
    {as: 'checkins', model: db.models.tracking_state_task_checkin, include:[{as: 'user', model: db.models.user.scope('public')}], separate: true}
  ];

  // Lookup POG first
  db.models.tracking_state_task.findOne(opts).then(
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
