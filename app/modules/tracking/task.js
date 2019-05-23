const db = require('../../models/');
const TooManyCheckIns = require('./exceptions/TooManyCheckIns');
const InvalidTaskOperation = require('./exceptions/InvalidTaskOperation');
const InvalidCheckInTarget = require('./exceptions/InvalidCheckInTarget');
const State = require('./state');
const Checkin = require('./checkin');
const Hook = require('./hook');

const logger = require('../../../lib/log');


class Task {
  /**
   * Initialize tracking state task object
   *
   * @param {string|object} init - Pass in either ident string or new object
   */
  constructor(init) {
    this.instance = null;
    this.model = db.models.tracking_state_task;
    this.allowedStates = [
      'pending',
      'active',
      'hold',
      'complete',
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
   * Create a checkin for this task
   *
   * @param {object} user - The user model instance
   * @param {string|int|boolean} payload - The payload to be placed with the checkin
   * @param {boolean} limitOverride - Over ride the check-in limit?
   * @param {boolean} checkStateComplete - Check if parent state is complete after task is checked in (optional, default: false)
   * @returns {Promise} - Resolves with updated task. Rejects with error object
   */
  async checkIn(user, payload = null, limitOverride = false, checkStateComplete = false) {
    // Init State wrapper
    const state = new State(this.instance.state);

    // Check for too many checkins
    if ((this.instance.checkins.length + 1) > this.instance.checkInsTarget && !limitOverride) {
      logger.error(`Too many check ins have occurred for this task. Max: ${this.instance.checkInsTarget}, attempted: ${(this.instance.checkins.length + 1)}`);
      throw new TooManyCheckIns(`Too many check ins have occurred for this task. Max: ${this.instance.checkInsTarget}, attempted: ${(this.instance.checkins.length + 1)}`);
    }

    try {
      await this.createCheckin(user, payload);
      await this.checkCompletion();

      if (checkStateComplete) {
        await state.checkCompleted();
      }

      const publicView = await this.getPublic();
      logger.debug(`Checked in task ${this.instance.name}`);

      return publicView;
    } catch (error) {
      logger.error(`Failed to perform check in ${error}`);
      throw new Error(`Failed to perform check in ${error}`);
    }
  }


  /**
   * Create a new task checkin event
   *
   * @param {object} user - The user model instance
   * @param {string|int|boolean} payload - The payload to be provided in the checkin
   * @returns {Promise.<object>} - Returns with created checkin instance
   */
  async createCheckin(user, payload) {
    const checkin = new Checkin(null);

    try {
      const createdCheckin = await checkin.createCheckin(this.instance, user, payload);

      // Add user to result.
      createdCheckin.user = user;

      // Add checkin to all checkins
      this.instance.checkins.push(createdCheckin);
      return createdCheckin;
    } catch (error) {
      logger.error(`Unable to perform checkin ${error}`);
      throw new Error(`Unable to perform checkin ${error}`);
    }
  }

  /**
   * Update CheckIns
   *
   * Update the targeted number of check-ins for this task
   *
   * @param {integer} target - The new number of check-in targets for this task
   * @returns {Promise.<object>} - Returns the current task instance
   */
  async updateCheckInsTarget(target) {
    if (typeof target !== 'number') {
      logger.error('The supplied check in target is not a valid integer');
      throw new InvalidCheckInTarget('The supplied check in target is not a valid integer');
    }

    this.instance.checkInsTarget = target;

    try {
      await this.instance.save();
      return this.instance;
    } catch (error) {
      logger.error(`Unable to save the updated target value ${error}`);
      throw new InvalidCheckInTarget(`Unable to save the updated target value ${error}`);
    }
  }

  /**
   * Undo a check in
   *
   * @param {array|string} target - The idents of the check-in to be removed
   * @param {boolean} all - Remove all checkins
   *
   * @returns {Promise.<object>} - Returns updated instance
   */
  async cancelCheckIn(target, all = false) {
    if (this.instance.checkIns === 0) {
      logger.error('Attempting to undo an invalid amount of check ins');
      throw new InvalidTaskOperation('Attempting to undo an invalid amount of check ins');
    }

    if (typeof target === 'string') {
      target = [target];
    }

    // Build Query
    const opts = {};

    if (!all) {
      opts.where = {ident: {$in: target}};
    } else {
      opts.where = {task_id: this.instance.id};
    }

    try {
      await db.models.tracking_state_task_checkin.destroy(opts);
    } catch (error) {
      logger.error(`Unable to delete tasks ${error}`);
      throw new Error(`Unable to delete tasks ${error}`);
    }

    // Change current status based on target
    if (this.instance.checkins.length === 0) {
      this.instance.status = 'pending';
    }
    if (this.instance.checkins.length > 0 && this.instance.checkins.length < this.instance.checkInsTarget) {
      this.instance.status = 'active';
    }

    try {
      await this.instance.save();
    } catch (error) {
      logger.error(`Unable to save the updated check ins amount ${error}`);
      throw new Error(`Unable to save the updated check ins amount ${error}`);
    }

    try {
      const task = await this.getPublic();
      return task;
    } catch (error) {
      logger.error(`Failed public lookup for task ${error}`);
      throw new Error(`Failed public lookup for task ${error}`);
    }
  }

  /**
   * Check Completion
   *
   * @returns {Promise.<object>} - Returns current instance
   */
  async checkCompletion() {
    // Get all checkins
    let checkins;
    try {
      checkins = await db.models.tracking_state_task_checkin.findAll({where: {task_id: this.instance.id}});
    } catch (error) {
      logger.error(`Failed to update completed task ${error}`);
      throw new Error(`Failed to update completed task ${error}`);
    }

    // Target not met yet
    if (checkins.length < this.instance.checkInsTarget) {
      return this.instance;
    }

    // Target met!
    this.instance.status = 'complete';

    try {
      await this.instance.save();
    } catch (error) {
      logger.error(`Failed to save instance ${error}`);
      throw new Error(`Failed to save instance ${error}`);
    }

    try {
      await Hook.check_and_invoke(this.instance.state, 'complete', this.instance);
      return this.instance;
    } catch (error) {
      logger.error(`Failed to check and invoke hook ${error}`);
      throw new Error(`Failed to check and invoke hook ${error}`);
    }
  }

  /**
   * Update unprotected values
   *
   * @param {object} task - Key-value pair object with values to be updated
   * @returns {undefined}
   */
  setUnprotected(task) {
    if (task.checkInsTarget) {
      this.instance.checkInsTarget = task.checkInsTarget;
    }
    if (task.description) {
      this.instance.description = task.description;
    }
    if (task.status) {
      this.instance.status = task.status;
    }
    if (task.assignedTo_id) {
      this.instance.assignedTo_id = task.assignedTo_id;
    }
  }

  /**
   * Update a task's status with trigger for state status flipping
   *
   * @param {string} status - The state to change the task to
   * @returns {Promise.<object>} - Returns the updated task
   */
  async setStatus(status) {
    // Check that the provided status is allowed
    if (!this.allowedStates.includes(status)) {
      logger.error('The provided status is not allowed');
      throw new Error('The provided status is not allowed');
    }

    this.instance.status = status;

    if (status === 'pending') {
      return this.instance;
    }

    // Init State wrapper
    const state = new State(this.instance.state);

    try {
      await state.setStatus('active', true);
    } catch (error) {
      logger.error(`Failed to set state status to active ${error}`);
      throw new Error(`Failed to set state status to active ${error}`);
    }

    try {
      await this.model.update({status}, {where: {ident: this.instance.ident}});
    } catch (error) {
      logger.error(`Failed to update model ${error}`);
      throw new Error(`Failed to update model ${error}`);
    }

    try {
      await Hook.check_and_invoke(this.instance.state, status, this.instance);
    } catch (error) {
      logger.error(`Failed to check and invoke hooks ${error}`);
      throw new Error(`Failed to check and invoke hooks ${error}`);
    }

    try {
      await state.checkCompleted();
      return this.instance;
    } catch (error) {
      logger.error(`Failed to check if state is completed ${error}`);
      throw new Error(`Failed to check if state is completed ${error}`);
    }
  }


  /**
   * Assign the task to new user
   *
   * @param {string|number} userId - The user's ident string or row ID
   * @returns {Promise.<object>} - Returns the public view of this Task
   */
  async setAsignedTo(userId) {
    // Check valid ident or id
    const opts = {where: {}};

    if (typeof userId === 'number') {
      opts.where.id = userId;
    } else if (typeof userId === 'string') {
      opts.where.ident = userId;
    } else {
      logger.error(`No valid user identification given ${userId} (expected id or ident)`);
      throw new Error(`No valid user identification given ${userId} (expected id or ident)`);
    }

    let user;
    try {
      user = await db.models.user.findOne(opts);
    } catch (error) {
      logger.error(`Error while trying to find user ${error}`);
      throw new Error(`Error while trying to find user ${error}`);
    }

    if (!user) {
      logger.error('Unable to find the specified user');
      throw new Error('Unable to find the specified user');
    }

    // Update entry
    this.instance.assignedTo_id = user.id;

    try {
      await this.instance.save();
    } catch (error) {
      logger.error(`Query to update task with updated assignee failed ${error}`);
      throw new Error(`Query to update task with updated assignee failed ${error}`);
    }

    try {
      const publicView = await this.getPublic();
      return publicView;
    } catch (error) {
      logger.error(`Unable to get public instance of task ${error}`);
      throw new Error(`Unable to get public instance of task ${error}`);
    }
  }

  /**
   * Get public version of this instance
   *
   * @returns {Promise.<object>} - Returns a public instance of the model
   */
  async getPublic() {
    const opts = {
      where: {
        ident: this.instance.ident,
      },
      limit: 1,
      order: [['ordinal', 'ASC']],
      attributes: {
        exclude: ['deletedAt'],
      },
      include: [
        {as: 'state', model: db.models.tracking_state.scope('noTasks')},
        {as: 'assignedTo', model: db.models.user.scope('public')},
        {as: 'checkins', model: db.models.tracking_state_task_checkin, include: 
          [
            {as: 'user', model: db.models.user.scope('public')},
          ],
        separate: true,
        },
      ],
    };

    try {
      const result = await this.model.findOne(opts);
      return result;
    } catch (error) {
      logger.error(`Query failed to find the public instance: ${error}`);
      throw new Error(`Query failed to find the public instance: ${error.message}`);
    }
  }
}

module.exports = Task;
