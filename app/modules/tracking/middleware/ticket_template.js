
const db = require(`${process.cwd()}/app/models`);
const MiddlewareNotFound = require('../../../middleware/exceptions/MiddlewareNotFound');
const MiddlewareQueryFailed = require('../../../middleware/exceptions/MiddlewareQueryFailed');

// Lookup POG middleware
module.exports = async (req, res, next, lookup) => {
  const opts = {where: {}};
  opts.attributes = {
    exclude: ['deletedAt'],
  };
  if (req.state) opts.where.state_id = req.state.id;
  // Check if it's a UUID
  opts.where.ident = lookup;
  opts.limit = 1;
  opts.order = [['ordinal', 'ASC']];
  opts.include = [
    {model: db.models.tracking_state_definition.scope('public'), as: 'definition'},
  ];
  try {
    // Lookup POG first
    const result = await db.models.tracking_ticket_template.findOne(opts);
    // Nothing found?
    if (result === null) throw new MiddlewareNotFound('Unable to find the tracking ticket template', req, res, 'trackingTicketTemplate');
    // POG found, next()
    if (result !== null) {
      req.template = result;
      next();
    }
  } catch (error) {
    console.log(error);
    throw new MiddlewareQueryFailed('Unable to looking the requested tracking ticket template.', req, res, 'failedTrackingTicketTemplateMiddlewareQuery');
  }
};
