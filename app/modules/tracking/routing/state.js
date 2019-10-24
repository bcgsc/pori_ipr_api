const {Op} = require('sequelize');
const db = require('../../../models');
const RoutingInterface = require('../../../routes/routingInterface');
const State = require('../state');

// Middleware
const stateMiddleware = require('../middleware/state');

const logger = require('../../../../lib/log');

class TrackingStateRoute extends RoutingInterface {
  /**
   * Tracking Definitions Routing
   *
   * POG Tracking State routes
   *
   * @param {object} io - Socket.io instance
   */
  constructor(io) {
    super();
    this.io = io;

    // Register middleware
    this.registerMiddleware('state', stateMiddleware);

    // Register root
    this.rootPath();

    // Register Definition endpoint
    this.statePath();

    // Assignee Path
    this.assignUser();

    this.router['get'](`/:state(${this.UUIDregex})/check`, async (req, res) => {
      const existing = new State(req.state);

      try {
        const result = await existing.checkCompleted();
        return res.json({result});
      } catch (error) {
        logger.error(`Error while checking if state has completed all tasks ${error}`);
        return res.status(500).json({message: 'Error while checking if state has completed all tasks', cause: error});
      }
    });
  }

  // URL Root
  rootPath() {
    this.registerResource('/')
      // Get all state definitions
      .get(this.getFilteredStates);
  }

  /**
   * Endpoint handler for retrieving filtered states
   *
   * @param {object} req - Express request
   * @param {object} res - Express response
   * @property {string} req.query.name - Names of states
   * @property {string} req.query.slug - Slugs of states
   * @property {string} req.query.status - Statuses of states
   * @property {string} req.query.createdAt - When states were created
   * @property {string} req.query.startedAt - When states were started
   * @property {string} req.query.unassigned - Are states unassigned (boolean wrapped in string)
   * @returns {Promise.<object>} - Returns all tracking state definitions
   */
  async getFilteredStates(req, res) {
    const opts = {
      attributes: {
        exclude: ['deletedAt'],
      },
      include: [
        {as: 'analysis', model: db.models.pog_analysis.scope('public')},
      ],
      order: [
        ['startedAt', 'ASC'],
        ['ordinal', 'ASC'],
      ],
      where: {},
    };

    if (req.query.name) {
      opts.where.name = req.query.name;
    }
    if (req.query.slug) {
      opts.where.slug = {[Op.in]: req.query.slug.split(',')};
    }
    if (req.query.status) {
      opts.where.status = {[Op.in]: req.query.status.split(',')};
    }

    if (req.query.createdAt && req.query.createdAt.split(',').length === 2) {
      opts.where.createdAt = {[Op.between]: req.query.createdAt.split(',')};
    }
    if (req.query.startedAt && req.query.startedAt.split(',').length === 2) {
      opts.where.startedAt = {[Op.between]: req.query.startedAt.split(',')};
    }

    const taskInclude = {
      as: 'tasks',
      model: db.models.tracking_state_task,
      order: [['ordinal', 'ASC'], [db.models.POG, 'POGID', 'desc']],
      include: [
        {as: 'assignedTo', model: db.models.user.scope('public')},
        {as: 'checkins', model: db.models.tracking_state_task_checkin, include: [{as: 'user', model: db.models.user.scope('public')}]},
      ], // end tasks include
    }; // end state tasks include

    if (req.query.unassigned === 'true') {
      taskInclude.where = {assignedTo_id: null};
    }

    opts.include.push(taskInclude);

    // Get All Definitions
    try {
      const states = await db.models.tracking_state.scope('public').findAll(opts);
      return res.json(states);
    } catch (error) {
      logger.error(`Unable to query definitions ${error}`);
      return res.status(500).json({error: {message: 'Unable to query definitions', cause: error}});
    }
  }

  statePath() {
    this.registerResource(`/:state(${this.UUIDregex})`)
    // Delete registered state definition
      .delete(async (req, res) => {
        try {
          await req.definition.destroy();
          return res.status(204);
        } catch (error) {
          logger.error(`Unable to remove state definition ${error}`);
          return res.status(500).json({message: 'Unable to remove state definition', cause: error});
        }
      })

      // Get current state definition
      .get(async (req, res) => {
        try {
          const {id, ...state} = req.state.toJSON();
          return res.json(state);
        } catch (error) {
          logger.error(`Unable to get current state definition ${error}`);
          return res.status(404).json({message: 'Unable to get current state definition', cause: error});
        }
      })

      // Update State
      .put(async (req, res) => {
        const existing = new State(req.state);

        try {
          const result = await existing.updateAll(req.body);
          return res.json(result);
        } catch (error) {
          logger.error(`Failed to update state ${error}`);
          return res.status(500).json({message: 'Failed to update state', cause: error});
        }
      });
  }

  // Assign user to all state tasks
  assignUser() {
    this.router['put'](`/:state(${this.UUIDregex})/assign/:assignee`, async (req, res) => {
      const existing = new State(req.state);

      // Update values
      try {
        const result = await existing.assignUser(req.params.assignee);
        return res.json(result);
      } catch (error) {
        if (error.error && error.error.code && error.error.code === 'userNotFound') {
          logger.error(`Unable to find the user provided ${error}`);
          return res.status(400).json({error: {message: 'Unable to find the user provided', cause: error}});
        }
        logger.error(`Unable to assign the specified user ${error}`);
        return res.status(500).json({error: {message: 'Unable to assign the specified user', cause: error}});
      }
    });
  }
}

module.exports = TrackingStateRoute;
