const db = require('../../models/');
const InvalidTaskOperation = require('./exceptions/InvalidTaskOperation');
const InvalidCheckInTarget = require('./exceptions/InvalidCheckInTarget');

const logger = require('../../../lib/log');

class Checkin {
  /**
   * Initialize tracking state task object
   *
   * @param {string|object} init - Pass in either ident string or new object
   * @param {object} options - Options object
   */
  constructor(init, options = {}) {
    this.instance = null;
    this.model = db.models.tracking_state_task_checkin;

    this.task = (options.task) ? options.task : null;

    if (!init) {
      logger.error('Unable to initiate checkin');
      throw new Error('Unable to initiate checkin');
    }

    // Existing instance
    if (typeof init === 'object' && typeof init.ident === 'string') {
      this.instance = init;
    }
  }

  /**
   * Create Checkin
   *
   * @param {object} task - Task object
   * @param {object} user - The user checking in
   * @param {string|int|boolean} payload - The outcome payload to be stored
   *
   * @returns {Promise.<object>} - Returns checkin model instance
   */
  async createCheckin(task, user, payload) {
    const checkin = {
      task_id: task.id,
      user_id: user.id,
      outcome: payload,
    };

    // Create the instance
    try {
      const result = await this.model.create(checkin);
      this.instance = result;
      return this.instance;
    } catch (error) {
      logger.error(`Failed to create checkin ${error}`);
      throw new Error(`Failed to create checkin ${error}`);
    }
  }

  /**
   * Update CheckIns
   *
   * Update the targeted number of check-ins for this task
   *
   * @param {integer} target - The new number of check-in targets for this task
   * @returns {Promise} - Returns the current updated task instance
   */
  async updateCheckInsTarget(target) {
    if (typeof target !== 'number') {
      logger.error(`The supplied check in target is not a valid integer ${target}`);
      throw new InvalidCheckInTarget('The supplied check in target is not a valid integer');
    }

    this.instance.checkInsTarget = target;

    try {
      await this.instance.save();
      return this.instance;
    } catch (error) {
      logger.error(`Unable to save the updated target value: ${target} with error: ${error}`);
      throw new InvalidCheckInTarget(`Unable to save the updated target value: ${target} with error: ${error}`);
    }
  }

  /**
   * Undo a check in
   *
   * @param {array|string} targets - The datestamp of the check-in to be removed
   * @param {boolean} all - Remove all checkins
   *
   * @returns {Promise} - Returns updated instance
   */
  async cancelCheckIn(targets, all = false) {
    if (this.instance.checkIns === 0) {
      logger.error('Attempting to undo an invalid amount of check ins');
      throw new InvalidTaskOperation('Attempting to undo an invalid amount of check ins');
    }

    // Removing a single entry
    if (!all) {
      if (typeof targets === 'string') {
        targets = [targets];
      }

      targets.forEach((target) => {
        if (!this.instance.outcome[target]) {
          logger.error('Unable to find the outcome to revoke');
          throw new InvalidTaskOperation('Unable to find the outcome to revoke');
        }
        delete this.instance.outcome[target];
      });

      if (Object.keys(this.instance.outcome).length === 0) {
        this.instance.outcome = null;
      }

      this.instance.checkIns = this.instance.checkIns - 1;
    } else {
      this.instance.outcome = null;
      this.instance.checkIns = 0;
    }

    // Change current status based on target
    if (this.instance.checkIns === 0) {
      this.instance.status = 'pending';
    }
    if (this.instance.checkIns > 0 && this.instance.checkIns < this.instance.checkInsTarget) {
      this.instance.status = 'active';
    }

    try {
      await this.instance.save();
      return this.instance;
    } catch (error) {
      logger.error(`Unable to save the updated check ins amount ${error}`);
      throw new InvalidTaskOperation(`Unable to save the updated check ins amount error: ${error}`);
    }
  }

  /**
   * Get public version of this instance
   *
   * @returns {Promise} - Return a public instance of the model
   */
  async getPublic() {
    return this.model.scope('public').findOne({where: {ident: this.instance.ident}});
  }
}

module.exports = Checkin;
