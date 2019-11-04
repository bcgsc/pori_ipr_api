const db = require('../../../models');
const MiddlewareNotFound = require('../../../middleware/exceptions/MiddlewareNotFound');
const MiddlewareQueryFailed = require('../../../middleware/exceptions/MiddlewareQueryFailed');

const logger = require('../../../log');

// Lookup POG middleware
module.exports = async (req, res, next, ident) => {
  const opts = {
    where: {
      ident,
    },
    attributes: {exclude: ['deletedAt']},
    limit: 1,
    order: [['ordinal', 'ASC']],
    include: [
      {model: db.models.tracking_state_definition.scope('public'), as: 'definition'},
    ],
  };

  if (req.state) {
    opts.where.state_id = req.state.id;
  }

  let trackingTicketTemplate;
  try {
    trackingTicketTemplate = await db.models.tracking_ticket_template.findOne(opts);
  } catch (error) {
    logger.error(`Error while finding tracking ticket template with ident: ${ident} error: ${error}`);
    throw new MiddlewareQueryFailed('Error while finding tracking ticket template', req, res, 'failedTrackingTicketTemplateMiddlewareQuery');
  }

  if (!trackingTicketTemplate) {
    logger.error(`Unable to find tracking ticket template with ident: ${ident}`);
    throw new MiddlewareNotFound('Unable to find the tracking ticket template', req, res, 'trackingTicketTemplate');
  }

  req.template = trackingTicketTemplate;
  return next();
};
