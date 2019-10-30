const db = require('../../../models');
const RoutingInterface = require('../../../routes/routingInterface');
const TicketTemplate = require('../ticket_template');

// Middleware
const ticketTemplateMiddleware = require('../middleware/ticket_template');
const definitionMiddleware = require('../middleware/definition');

const logger = require('../../../log');

class TrackingTicketTemplateRoutes extends RoutingInterface {
  /**
   * Tracking Ticket Templates Routing
   *
   * POG Tracking Ticket Templates routes
   *
   * @param {object} io - Socket.io instance
   */
  constructor(io) {
    super();
    this.io = io;

    // Register Middleware
    this.router.param('template', ticketTemplateMiddleware);
    this.router.param('definition', definitionMiddleware);

    // Register Task endpoint
    this.rootPath();
  }

  // URL Root
  rootPath() {
    this.router.route('/definition/:definition')
    // Get all state definitions
      .get(async (req, res) => {
        // Get All Definitions
        try {
          const templates = await db.models.tracking_ticket_template.scope('public').findAll({where: {definition_id: req.definition.id}});
          return res.json(templates);
        } catch (error) {
          logger.error(`Unable to query definitions ${error}`);
          return res.status(500).json({error: {message: 'Unable to query definitions', cause: error}});
        }
      })

      // Create state definition
      .post(async (req, res) => {
        const template = {
          definition_id: req.definition.id,
          name: req.body.name,
          body: req.body.body,
          project: req.body.project,
          issueType: req.body.issueType,
          priority: req.body.priority,
          components: req.body.components,
          tags: req.body.tags,
          summary: req.body.summary,
          security: req.body.security,
        };

        let ticket;
        try {
          ticket = await db.models.tracking_ticket_template.create(template);
        } catch (error) {
          logger.error(`Failed to create ticket template ${error}`);
          return res.status(500).json({message: 'Failed to create ticket template', cause: error});
        }

        const Ticket = new TicketTemplate(ticket);

        try {
          const result = await Ticket.getPublic();
          return res.json(result);
        } catch (error) {
          logger.error(`Unable to retrieve new ticket template after creating ${error}`);
          return res.status(500).json({message: 'Unable to retrieve new ticket template after creating', cause: error});
        }
      });

    this.router.route('/definition/:definition/template/:template')
      // Update ticket template
      .put(async (req, res) => {
        const Ticket = new TicketTemplate(req.template);

        try {
          const ticket = await Ticket.update(req.body);
          return res.json(ticket);
        } catch (error) {
          logger.error(`Unable to update ticket template ${error}`);
          return res.status(500).json({message: 'Unable to update ticket template', cause: error});
        }
      })

      // Remove ticket template
      .delete(async (req, res) => {
        try {
          await db.models.tracking_ticket_template.destroy({where: {ident: req.template.ident}});
          return res.status(204).send();
        } catch (error) {
          logger.error(`Failed to remove ticket template ${error}`);
          return res.status(500).json({message: 'Failed to remove ticket template', cause: error});
        }
      });
  }
}

module.exports = TrackingTicketTemplateRoutes;
