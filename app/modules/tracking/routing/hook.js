const db = require('../../../models');
const RoutingInterface = require('../../../routes/routingInterface');
const hookMiddleware = require('../middleware/hook');

const logger = require('../../../../lib/log');

class TrackingDefinitionRoute extends RoutingInterface {
  /**
   * Tracking Definitions Routing
   *
   * POG Tracking State Definitions routes
   *
   * @param {object} io - Socket.io instance
   */
  constructor(io) {
    super();

    this.io = io;

    // Register middleware
    this.registerMiddleware('hook', hookMiddleware);

    // Register root
    this.rootPath();

    // Register Definition endpoint
    this.hookPath();
  }

  // URL Root
  rootPath() {
    this.registerResource('/')

      // Create new state definition
      .get(async (req, res) => {
        const opts = {where: {}};

        if (req.query.state) {
          opts.where.state_name = req.query.state;
        }

        // Add entries
        try {
          const trackingHooks = await db.models.tracking_hook.findAll(opts);
          return res.json(trackingHooks);
        } catch (error) {
          logger.error(`Failed to retrieve all hooks ${error}`);
          return res.status(500).json({message: 'Failed to retrieve all hooks', cause: error});
        }
      })

      // Get all state definitions
      .post(async (req, res) => {
        // Requireds
        if (!req.body.name) {
          logger.error('Hook name is required');
          return res.status(400).json({message: 'Hook name is required'});
        }
        if (!req.body.state_name) {
          logger.error('State slug name is required');
          return res.status(400).json({message: 'State slug name is required'});
        }
        if (!req.body.status) {
          logger.error('Transition to status is required');
          return res.status(400).json({message: 'Transition to status is required'});
        }
        if (!req.body.action) {
          logger.error('Action type for hook is required');
          return res.status(400).json({message: 'Action type for hook is required'});
        }
        if (!req.body.target) {
          logger.error('List of targets is required');
          return res.status(400).json({message: 'List of targets is required'});
        }
        if (!req.body.payload) {
          logger.error('A payload/body is required');
          return res.status(400).json({message: 'A payload/body is required'});
        }
        if (!req.body.enabled) {
          logger.error('Enabled true/false is required');
          return res.status(400).json({message: 'Enabled true/false is required'});
        }

        // Get All Definitions
        try {
          const definitions = await db.models.tracking_hook.create(req.body);
          return res.json(definitions);
        } catch (error) {
          logger.error(`Unable to query definitions ${error}`);
          return res.status(500).json({message: 'Unable to query definitions', cause: error});
        }
      });
  }

  hookPath() {
    this.registerResource('/:hook([A-z0-9-]{36})')

      // Delete definition
      .delete(async (req, res) => {
        try {
          await db.models.tracking_hook.destroy({where: {ident: req.hook.ident}});
          return res.status(204).send();
        } catch (error) {
          logger.error(`Failed to remove hook ${error}`);
          return res.status(500).json({message: 'Failed to remove hook', cause: error});
        }
      })

      // Get current definition
      .get((req, res) => {
        const {id, ...hook} = req.hook.toJSON();
        return res.json(hook);
      })

      // Update definition
      .put(async (req, res) => {
        const data = {};

        if (req.body.name) {
          data.name = req.body.name;
        }
        if (req.body.state_name) {
          data.state_name = req.body.state_name;
        }
        if (req.body.task_name) {
          data.task_name = req.body.task_name;
        }
        if (req.body.status) {
          data.status = req.body.status;
        }
        if (req.body.action) {
          data.action = req.body.action;
        }
        if (req.body.target) {
          data.target = req.body.target;
        }
        if (req.body.payload) {
          data.payload = req.body.payload;
        }
        if (req.body.enabled) {
          data.enabled = req.body.enabled;
        }

        // Update tracking hook definition
        try {
          await db.models.tracking_hook.update(data, {where: {ident: req.hook.ident}});
        } catch (error) {
          logger.error(`Failed to update hook ${req.hook.ident} with error: ${error}`);
          return res.status(500).json({message: 'Failed to update hook', cause: error});
        }

        try {
          const trackingHook = await db.models.tracking_hook.scope('public').findOne({where: {ident: req.hook.ident}});
          return res.json(trackingHook);
        } catch (error) {
          logger.error(`Failed to find hook ${req.hook.ident} with error ${error}`);
          return res.status(500).json({message: 'Failed to find the hook', cause: error});
        }
      });
  }
}

module.exports = TrackingDefinitionRoute;
