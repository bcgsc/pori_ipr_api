const db = require('../../models');
const InvalidTaskDefinition = require('./exceptions/InvalidTaskDefinition');
const InvalidStateDefintion = require('./exceptions/InvalidStateDefinition');

const logger = require('../../../lib/log');

class TrackingGenerator {
  /**
   * Initialize tracking entries for a biopsy
   *
   * @param {object} analysis - Analysis object
   * @param {object} user - Current user instance
   */
  constructor(analysis, user) {
    this.user = user;
    this.analysis = analysis;
  }

  /**
   * Generate Tracking States
   *
   * @param {Array.<object>} states - States to generate tracking for in the format [{slug: <state slug>, status: <status to initialize>}, ...]
   * @returns {Promise.<Array.<object>>} - Returns newly generated tracking states
   */
  async generateTrackingStates(states) {
    const slugs = states.map((state) => {
      return state.slug;
    });

    // Retrieve current set of definitions
    let trackingStateDefinitions;
    try {
      trackingStateDefinitions = await db.models.tracking_state_definition.findAll({
        where: {
          hidden: false,
          slug: {$in: slugs},
        },
      });
    } catch (error) {
      logger.error(`Failed to retrieve all currently defined states ${error}`);
      throw new Error(`Failed to retrieve all currently defined states ${error}`);
    }

    // get status to set based off of state definition slug
    try {
      const promises = trackingStateDefinitions.map((definition) => {
        const stateDef = states.find((state) => {
          return state.slug === definition.slug;
        });

        const {status} = stateDef;

        return this.createState(definition, status);
      });

      await Promise.all(promises);
    } catch (error) {
      logger.error(`Failed to create all the states ${error}`);
      throw new Error(`Failed to create all the states ${error}`);
    }

    try {
      const trackingStates = await db.models.tracking_state.findAll({where: {analysis_id: this.analysis.id}});
      return trackingStates;
    } catch (error) {
      logger.error(`Unable to retrieve newly created states ${error}`);
      throw new Error(`Unable to retrieve newly created states ${error}`);
    }
  }

  /**
   * Generate a state entry with a definition
   *
   * @param {object} definition - The definition/template to use
   * @param {string} status - The status to initialize the state to (optional)
   *
   * @returns {Promise.<Array.<object>>} - Returns array of created tasks
   */
  async createState(definition, status = null) {
    const ordinalStatus = (definition.ordinal === 1) ? 'active' : 'pending';
    const setStatus = status || ordinalStatus; // unless explicitly specified, default to start as pending if not ordinal=0

    // Create new state
    const newState = {
      analysis_id: this.analysis.id,
      group_id: definition.group_id,
      name: definition.name,
      slug: definition.slug,
      description: definition.description,
      ordinal: definition.ordinal,
      status: setStatus,
      startedAt: null,
      createdBy_id: this.user.id,
    };

    // Create State
    let state;
    try {
      state = await db.models.tracking_state.create(newState);
    } catch (error) {
      logger.error(`Unable to create tracking state definition: ${definition.name} with error ${error}`);
      throw new InvalidStateDefintion(`Unable to create tracking state definition: ${definition.name} with error ${error}`);
    }

    // Create Tasks
    const promises = definition.tasks.map((task, index) => {
      return this.createTask(state, task, index);
    });

    try {
      const tasks = await Promise.all(promises);
      return tasks;
    } catch (error) {
      logger.error(`Unable to create tasks ${error}`);
      throw new Error(`Unable to create tasks ${error}`);
    }
  }

  /**
   * Create a new task instance from a definition
   *
   * @param {object} state - The state the task belongs to
   * @param {object} task - The task definition
   * @param {integer} ordinal - The execution order number for the task
   *
   * @returns {Promise.<object>} - Returns created task definition
   */
  async createTask(state, task, ordinal) {
    const newTask = {
      state_id: state.id,
      name: task.name,
      slug: task.slug,
      description: task.description,
      ordinal,
      status: task.status,
      outcomeType: task.outcomeType,
      checkInsTarget: task.checkInsTarget,
    };

    try {
      const createdTask = await db.models.tracking_state_task.create(newTask);
      return createdTask;
    } catch (error) {
      logger.error(`Failed to create task ${task.slug} due to a SQL error ${error}`);
      throw new InvalidTaskDefinition(`Failed to create task ${task.slug} due to a SQL error ${error}`);
    }
  }
}

module.exports = TrackingGenerator;
