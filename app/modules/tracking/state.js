const _ = require('lodash');
const moment = require('moment');
const validate = require('uuid-validate');
const db = require('../../models/');
const InvalidStateStatus = require('./exceptions/InvalidStateStatus');
const Hook = require('./hook');
const Generator = require('./generate');

const logger = require('../../../lib/log');

class State {
  /**
   * Initialize tracking state object
   *
   * @param {string|object} init - Pass in either ident string or new object
   */
  constructor(init) {
    this.instance = null;
    this.model = db.models.tracking_state;
    this.allowedStates = [
      'active',
      'pending',
      'complete',
      'hold',
      'failed',
      'cancelled',
    ];

    // Existing instance
    if (typeof init === 'object' && typeof init.ident === 'string') {
      this.instance = init;
    }

    if (init === undefined || this.instance === null) {
      logger.error('Unable to instantiate State Tracking object');
      throw new Error('Unable to instantiate State Tracking object');
    }
  }

  /**
   * Update all possible settings
   *
   * @param {object} update - Key-value pair of items to be updated
   * @returns {Promise.<object>} - Returns updated instance
   */
  async updateAll(update) {
    await this.assignUser((update.assignedTo !== undefined && update.assignedTo !== null) ? update.assignedTo : null);
    await this.setUnprotected(update);
    await this.setStatus(update.status);
    await this.instance.save();
    await this.createNextState();
    return this.getPublic();
  }

  /**
   * Set the status of a state
   *
   * @param {string} status - The updated status to assign to the state
   * @param {boolean} save - Save the change in this call
   * @returns {Promise.<object>} - Returns updated instance
   */
  async setStatus(status, save = false) {
    // Validate status
    if (!this.allowedStates.includes(status)) {
      logger.error('The provided status is not valid');
      throw new InvalidStateStatus('The provided status is not valid');
    }

    // Update State Status
    this.instance.status = status;

    logger.debug('Setting status of', this.instance.status);

    if (!this.instance.startedAt && (status === 'active' || status === 'completed')) {
      this.instance.startedAt = moment().toISOString();
    }
    if (!this.instance.completedAt && status === 'completed') {
      this.instance.completedAt = moment().toISOString();
    }

    // Save or not to save
    if (save) {
      try {
        await this.instance.save();
        await this.createNextState();
        await Hook.check_and_invoke(this.instance.slug, status);

        return this.instance;
      } catch (error) {
        logger.error(`Unable to update the tracking state ${error}`);
        throw new Error(`Unable to update the tracking state ${error}`);
      }
    } else {
      try {
        const hooks = await Hook.check_hook(this.instance.slug, status);
        if (hooks && hooks.length > 0) {
          const invokedHooks = hooks.map((hook) => {
            return Hook.invoke_hook(hook, this.instance);
          });

          await Promise.all(invokedHooks);
        }

        return this.instance;
      } catch (error) {
        logger.error(`Failed to check for and execute hooks ${error}`);
        throw new Error(`Failed to check for and execute hooks ${error}`);
      }
    }
  }

  /**
   * Check if a state has completed all tasks
   *
   * @returns {Promise.<boolean>} - Returns if all tasks are completed or not
   */
  async checkCompleted() {
    let stateComplete = true;
    this.instance.status = 'active';

    logger.debug('[state]', `Starting Check Completed for state id ${this.instance.id}`);

    // get Tasks
    let tasks;
    try {
      tasks = await db.models.tracking_state_task.findAll({where: {state_id: this.instance.id}});
    } catch (error) {
      logger.error(`Unable to find all tracking state tasks state id: ${this.instance.id} error: ${error}`);
      throw new Error(`Unable to find all tracking state tasks state id: ${this.instance.id} error: ${error}`);
    }

    // Check for any incomplete tasks
    for (const task of tasks) {
      if (task.status !== 'complete') {
        stateComplete = false;
        break;
      }
    }

    if (!this.instance.startedAt) {
      this.instance.startedAt = moment().toISOString();
    }

    if (stateComplete) {
      this.instance.completedAt = moment().toISOString();
      this.instance.status = 'complete';
    }

    logger.debug('[state]', 'Checking if state is complete', stateComplete);

    try {
      await this.instance.save();
    } catch (error) {
      logger.error(`Unable to update state ${error}`);
      throw new Error(`Unable to update state ${error}`);
    }

    // Current state has completed!
    if (stateComplete) {
      logger.debug('[state]', 'Marking state as complete');

      // Check For Hooks
      let hooks;
      try {
        hooks = await Hook.check_hook(this.instance.slug, 'complete', null);
      } catch (error) {
        logger.error(`Unable to check for hooks ${error}`);
        throw new Error(`Unable to check for hooks ${error}`);
      }

      try {
        const invokedHooks = hooks.map((hook) => {
          return Hook.invoke_hook(hook, this.instance);
        });

        await Promise.all(invokedHooks);
      } catch (error) {
        logger.error(`Unable to invoke hooks ${error}`);
        throw new Error(`Unable to invoke hooks ${error}`);
      }

      try {
        await this.createNextState();
        return true;
      } catch (error) {
        logger.error(`Unable to create next state ${error}`);
        throw new Error(`Unable to create next state ${error}`);
      }
    } else {
      // State not complete
      logger.debug('[state]', 'State not complete');
      return false;
    }
  }

  /**
   * Create next State
   *
   * Takes in the current state model object and status and creates new tracking cards
   *
   * @returns {Promise.<object>} - Returns state model objects that have been created
   */
  async createNextState() {
    logger.debug(`Starting next state check from state ${this.instance.name} (id: ${this.instance.id}, status: ${this.instance.status})`);
    let nextStates = [];
    let createNewStates = [];

    // retrieve next_state_on_status info for state definition
    let stateDefinition;
    try {
      stateDefinition = await db.models.tracking_state_definition.findOne({
        where: {
          slug: this.instance.slug,
        },
      });
    } catch (error) {
      logger.error(`Unable to find state definition slug: ${this.instance.slug} error: ${error}`);
      throw new Error(`Unable to find state definition slug: ${this.instance.slug} error: ${error}`);
    }

    // return null if no definition specified for state or for status
    if (!stateDefinition || !_.has(stateDefinition.next_state_on_status, this.instance.status)) {
      logger.info('No definition specified for state or for status, returning null');
      return null;
    }

    // get next state(s) to create based on current status
    nextStates = stateDefinition.next_state_on_status[this.instance.status];

    // Check if states have already been created for this analysis
    const nextStateSlugs = nextStates.map((state) => {
      return state.slug;
    });

    let existingStates;
    try {
      existingStates = await db.models.tracking_state.findAll({
        where: {
          analysis_id: this.instance.analysis_id,
          slug: {
            $in: nextStateSlugs,
          },
        },
      });
    } catch (error) {
      logger.error(`Unable to find tracking states analysis id: ${this.instance.analysis_id} error: ${error}`);
      throw new Error(`Unable to find tracking states analysis id: ${this.instance.analysis_id} error: ${error}`);
    }

    // filter for states that don't yet exist for this analysis
    createNewStates = _.differenceBy(nextStates, existingStates, 'slug');

    // create promises to start states that already exist
    try {
      const startStates = existingStates.map((state) => {
        // get status to set next states to from state definition
        const setStatusTo = _.find(nextStates, {slug: state.slug}).status;
        logger.debug(`Next state ${state.name} already exists - setting status to ${setStatusTo}`);

        const newState = new State(state);
        return newState.setStatus(setStatusTo, true);
      });

      await Promise.all(startStates);
    } catch (error) {
      logger.error(`Unable to start all the states ${error}`);
      throw new Error(`Unable to start all the states ${error}`);
    }

    const analysis = {id: this.instance.analysis_id};
    const user = {id: this.instance.createdBy_id};

    logger.debug(`Creating new states: ${JSON.stringify(createNewStates)}`);

    const generator = new Generator(analysis, user);

    // generate new tracking state cards for states that don't exist yet
    try {
      const createdState = await generator.generateTrackingStates(createNewStates);
      return createdState;
    } catch (error) {
      logger.error(`Unable to generate tracking states ${error}`);
      throw new Error(`Unable to generate tracking states ${error}`);
    }
  }

  /**
   * Update unprotected values
   *
   * @param {object} input - Key-value pair object with values to be updated
   * @returns {undefined}
   */
  setUnprotected(input) {
    if (input.name) {
      this.instance.name = input.name;
    }
    if (input.description) {
      this.instance.description = input.description;
    }
    if (input.completedAt) {
      this.instance.completedAt = input.completedAt;
    }
    if (input.startedAt) {
      this.instance.startedAt = input.startedAt;
    }
    if (input.jira) {
      this.instance.jira = input.jira;
    }
  }


  /**
   * Assigns a user to all state tasks
   *
   * @param {string|object} user - The username or user ident to be assigned
   * @returns {Promise.<object>} - Returns updated state instance
   */
  async assignUser(user) {
    // Check for null first
    if (!user) {
      return this.instance;
    }

    // Check for passed object
    if (typeof user === 'object' && user.ident) {
      user = user.ident;
    }

    // Find user
    if (typeof user !== 'string') {
      logger.error('User input must be a string');
      throw new Error('User input must be a string');
    }

    // Lookup user
    const userOpts = {where: {}};

    if (validate(user)) {
      userOpts.where.ident = user;
    } else {
      userOpts.where.username = user;
    }

    // Lookup User
    let userResult;
    try {
      userResult = await db.models.user.findOne(userOpts);
    } catch (error) {
      logger.error(`Unable to find user ${user} with error ${error}`);
      throw new Error(`Unable to find user ${user} with error ${error}`);
    }

    if (!userResult) {
      logger.error(`Unable to find the specified user ${user}`);
      throw new Error(`Unable to find the specified user ${user}`);
    }

    if (userResult.id === this.instance.assignedTo_id) {
      return this.instance;
    }

    const taskOpts = {
      where: {
        state_id: this.instance.id,
      },
    };

    this.instance.assignedTo_id = userResult.id;

    // Update tasks with new assigneee
    try {
      await db.models.tracking_state_task.update({assignedTo_id: userResult.id}, taskOpts);
    } catch (error) {
      logger.error(`Unable to update tracking state ${error}`);
      throw new Error(`Unable to update tracking state ${error}`);
    }

    // Retrieve public version of this state
    try {
      const publicVersion = await this.getPublic();
      return publicVersion;
    } catch (error) {
      logger.error(`Unable to get public version of state ${error}`);
      throw new Error(`Unable to get public version of state ${error}`);
    }
  }

  /**
   * Get full public version of this instance
   *
   * @returns {Promise.<object>} - Returns public version of state
   */
  async getPublic() {
    const opts = {
      where: {
        ident: this.instance.ident,
      },
      attributes: {
        exclude: ['deletedAt'],
      },
      include: [
        {as: 'analysis', model: db.models.pog_analysis.scope('public')},
        {
          as: 'tasks',
          model: db.models.tracking_state_task,
          order: [['ordinal', 'ASC']],
          include: [
            {as: 'assignedTo', model: db.models.user.scope('public')},
            {
              as: 'checkins',
              model: db.models.tracking_state_task_checkin,
              include: [{as: 'user', model: db.models.user.scope('public')}],
            },
          ],
        },
      ],
    };

    // Get updated public state with nested tasks
    try {
      const state = await this.model.scope('public').findOne(opts);
      return state;
    } catch (error) {
      logger.error(`Unable to get updated state ${error}`);
      throw new Error(`Unable to get updated state ${error}`);
    }
  }
}

module.exports = State;
