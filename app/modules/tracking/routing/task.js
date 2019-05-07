const db = require('../../../models');
const RoutingInterface = require('../../../routes/routingInterface');
const Task = require('../task');
const State = require('../state');

// Middleware
const pogMiddleware = require('../../../middleware/pog');
const analysisMiddleware = require('../../../middleware/analysis');
const definitionMiddleware = require('../middleware/definition');
const stateMiddleware = require('../middleware/state');
const taskMiddleware = require('../middleware/task');

const logger = require('../../../../lib/log');

class TrackingTaskRoute extends RoutingInterface {
  /**
   * Tracking Tasks Routing
   *
   * POG Tracking State Tasks routes
   *
   * @param {object} io - Socket.io instance
   */
  constructor(io) {
    super();
    this.io = io;

    // Register Middleware
    this.registerMiddleware('POG', pogMiddleware);
    this.registerMiddleware('analysis', analysisMiddleware);
    this.registerMiddleware('definition', definitionMiddleware);
    this.registerMiddleware('state', stateMiddleware);
    this.registerMiddleware('task', taskMiddleware);

    // Register Task endpoint
    this.taskPath();

    // Register checkin operation endpoints
    this.checkIns();

    // User Assignment
    this.assignUser();
  }

  // URL Root
  rootPath() {
    this.registerResource('/')
    // Get all state definitions
      .get(async (req, res) => {
        try {
          const states = await db.models.tracking_state_task.scope('public').findAll();
          return res.json(states);
        } catch (error) {
          logger.error(`Unable to query definitions ${error}`);
          return res.status(500).json({error: {message: 'Unable to query definitions', cause: error}});
        }
      });
  }


  // Basic Task Operations
  taskPath() {
    this.registerResource('/:task([A-z0-9-_]{3,})')
      // Remove task
      .delete(async (req, res) => {
        // TODO: Validation on authorization
        try {
          await req.task.destroy();
          return res.status(204).end();
        } catch (error) {
          logger.error(`Error while trying to delete task ${error}`);
          return res.status(500).json({message: 'Error while trying to delete task', cause: error});
        }
      })

      // Get current task
      .get((req, res) => {
        try {
          const {id, ...task} = req.task.toJSON();
          return res.json(task);
        } catch (error) {
          logger.error(`Unable to get current task ${error}`);
          return res.status(404).json({message: 'Unable to get current task', cause: error});
        }
      })

      // Update task
      .put(this.updateTask.bind(this));

    // Update Task Details
    this.registerEndpoint('put', '/:POG/:analysis/:state/:task', this.updateTask.bind(this));
    this.registerEndpoint('put', '/:task([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})', this.updateTask.bind(this));

    // Retrieve Task
    this.registerEndpoint('get', '/:POG/:analysis/:state/:task', (req, res) => {
      const {id, ...response} = req.task.toJSON();
      return res.json(response);
    });
  }

  // Update task
  async updateTask(req, res) {
    const existing = new Task(req.task);
    const oldStatus = existing.instance.status; // current status of task
    const newStatus = req.body.status; // status to set task to

    // Update values
    existing.setUnprotected(req.body);

    // Update Tasks & save
    try {
      await existing.instance.save();
    } catch (error) {
      logger.error(`Failed to update task ${error}`);
      return res.status(500).json({message: 'Failed to update task', cause: error});
    }

    try {
      const result = await existing.getPublic();
      // if the new task status is different than the old one, check if state is complete
      if (oldStatus !== newStatus) {
        const state = new State(existing.instance.state);
        await state.checkCompleted();
      }

      this.io.emit('taskStatusChange', result);
      return res.json(result);
    } catch (error) {
      logger.error(`Failed to get updated task ${error}`);
      return res.status().json({message: 'Failed to get updated task', cause: error});
    }
  }


  // Check in a task
  checkIns() {
    // Checkin by pog/analysis(biospec, or biop)/state_slug/task_slug
    this.registerEndpoint('patch', '/checkin/:POG/:analysis/:state/:task', async (req, res) => {
      const entry = new Task(req.task);

      try {
        const result = await entry.checkIn(req.user, req.body.outcome, false, true);
        const {id, state_id, assignedTo_id, ...response} = result.toJSON();

        this.io.emit('taskStatusChange', response);
        return res.json(response);
      } catch (error) {
        logger.error(`Unable to check-in task ${error}`);
        return res.status(400).json({message: 'Unable to check-in task', cause: error});
      }
    });

    // Checkin by ident
    this.registerEndpoint('patch', '/checkin/:task([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})', async (req, res) => {
      const entry = new Task(req.task);

      // Update
      try {
        const result = await entry.checkIn(req.user, req.body.outcome, false, true);
        const {id, state_id, assignedTo_id, ...response} = result.toJSON();
        return res.json(response);
      } catch (error) {
        logger.error(`Unable to check-in task ${error}`);
        return res.status(400).json({error: {message: 'Unable to check-in task', cause: error}});
      }
    });

    // Cancel a check-in
    this.registerEndpoint('delete', `/checkin/:task(${this.UUIDregex})/:checkin/:all?`, async (req, res) => {
      const entry = new Task(req.task);

      const outcomes = (req.params.checkin.indexOf(',')) ? req.params.checkin.split(',') : [req.params.checkin];
      const all = (req.params.all);

      try {
        const result = await entry.cancelCheckIn(outcomes, all);
        return res.json(result);
      } catch (error) {
        logger.error(`Unable to cancel check-in ${error}`);
        return res.status(500).json({error: {message: 'Unable to cancel check-in', cause: error}});
      }
    });
  }

  // Assign a user to a task
  assignUser() {
    this.registerEndpoint('put', `/:task(${this.UUIDregex})/assignTo/:user(${this.UUIDregex})`, async (req, res) => {
      const entry = new Task(req.task);

      try {
        const result = await entry.setAsignedTo(req.params.user);
        return res.json(result);
      } catch (error) {
        logger.error(`Unable to update assigned user ${error}`);
        return res.status(400).json({message: 'Unable to update assigned user', cause: error});
      }
    });
  }
}

module.exports = TrackingTaskRoute;
