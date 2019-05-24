const db = require('../../models/');
const InvalidTaskDefinition = require('./exceptions/InvalidTaskDefinition');
const FailedCreateQuery = require('../../models/exceptions/FailedCreateQuery');

const logger = require('../../../lib/log');

class StateDefinition {
  /**
   * Initialize State Definition object
   *
   * @param {string|object} init - Pass in either ident string or new object
   * @param {object} options - Options object
   */
  constructor(init = null) {
    this.instance = null;
    this.model = db.models.tracking_state_definition;
    this.validTasks = [];
    this.allowedOutcomeType = ['date', 'text', 'location', 'string', 'boolean', 'pass/fail/proceed/oncopanel'];

    // No existing instance
    if (!init) {
      this.instance = this.model.build();
    }

    // New instance with passed values
    if (typeof init === 'object' && init.ident === undefined) {
      this.instance = this.model.build({
        name: init.name, ordinal: init.ordinal, description: init.description, group_id: init.group_id, slug: init.slug,
      });
    }

    // Existing instance
    if (typeof init === 'object' && typeof init.ident === 'string') {
      this.instance = init;
    }
  }

  /**
   * Update the definition's task list
   *
   * @param {array} tasks - Array of input tasks
   * @param {boolean} save - Whether to save updated task list to db
   * @returns {Promise.<object>} - Returns updated instance
   */
  async updateTasks(tasks, save = false) {
    // Loop over tasks and validate
    tasks.forEach((task) => {
      this.validateTask(task);

      // Add to validated tasks
      this.validTasks.push(task);
    });

    this.instance.tasks = this.validTasks;

    if (!save) {
      return this.validTasks;
    }

    // Save task
    try {
      await this.instance.save();
      return this.instance;
    } catch (error) {
      logger.error(`Failed to save state definition ${error}`);
      throw new FailedCreateQuery(`Failed to save state definition with error: ${error}`);
    }
  }


  /**
   * Validate a task
   *
   * @param {object} task - The task to be validated
   * @returns {undefined}
   * @throws {InvalidTaskDefinition} - If invalid task
   */
  validateTask(task) {
    // Check task slug
    if (!/^[A-z0-9_-]*$/g.test(task.slug)) {
      logger.error(`The task ${task.name} name must only contain alphanumeric values and underscores`);
      throw new InvalidTaskDefinition(`The task ${task.name} name must only contain alphanumeric values and underscores`);
    }

    // Check that the slug is unique
    const duplicateSlug = this.validTasks.find((validTask) => {
      return task.slug === validTask.slug;
    });

    if (duplicateSlug) {
      logger.error(`The task ${task.name} is using a slug that is already in use`);
      throw new InvalidTaskDefinition(`The task ${task.name} is using a slug that is already in use`);
    }

    if (task.outcomeType && !this.allowedOutcomeType.includes(task.outcomeType)) {
      logger.error(`The task ${task.name} has an unsupported outcome type: ${task.outcomeType}`);
      throw new InvalidTaskDefinition(`The task ${task.name} has an unsupported outcome type: ${task.outcomeType}`);
    }
  }

  /**
   * Update the group setting
   *
   * @param {string} group - Update the group setting for this definition (ident)
   * @returns {Promise.<object>} - Returns the current instance
   */
  async updateGroup(group) {
    if (group === this.instance.group.ident) {
      return this.instance;
    }

    let userGroup;
    try {
      userGroup = await db.models.userGroup.findOne({where: {ident: group}});
    } catch (error) {
      logger.error(`Error trying to find user group ident: ${group} error: ${error}`);
      throw new Error(`Error trying to find user group ident: ${group} error: ${error}`);
    }

    if (!userGroup) {
      logger.error(`Unable to find the specified group ident: ${group}`);
      throw new Error(`Unable to find the specified group ident: ${group}`);
    }

    this.instance.group_id = userGroup.id;

    try {
      await this.instance.save();
      return this.instance;
    } catch (error) {
      logger.error(`Unable to save tracking definition ${error}`);
      throw new Error(`Unable to save tracking definition ${error}`);
    }
  }

  /**
   * Update unprotected values
   *
   * @param {object} input - key-value pair object with values to be updated
   * @returns {undefined}
   */
  setUnprotected(input) {
    if (input.name) {
      this.instance.name = input.name;
    }
    if (input.slug) {
      this.instance.slug = input.slug;
    }
    if (input.description) {
      this.instance.description = input.description;
    }
    if (input.ordinal) {
      this.instance.ordinal = input.ordinal;
    }
    if (input.group_id) {
      this.instance.group_id = input.group_id;
    }
    if (input.hidden !== undefined) {
      this.instance.hidden = input.hidden;
    }
  }
}

module.exports = StateDefinition;
