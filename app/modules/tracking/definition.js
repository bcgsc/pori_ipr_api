"use strict";

const _                       = require('lodash');
const db                      = require('../../models/');
const InvalidTaskDefinition   = require('./exceptions/InvalidTaskDefinition');
const FailedCreateQuery       = require('../../models/exceptions/FailedCreateQuery');

module.exports = class StateDefinition {

  /**
   *
   *
   * @param {string|object} init - Pass in either ident string or new object
   * @param {object} options - Options object
   */
  constructor(init=null, options={}) {
    this.instance = null;
    this.model = db.models.tracking_state_definition;
    this.validTasks = [];
    this.allowedOutcomeType = ['date', 'text', 'directory', 'string', 'boolean'];

    // No existing instance
    if(init === null) this.instance = this.model.build();

    // New instance with passed values
    if(typeof init === 'object' && init.ident === undefined) {
      this.instance = this.model.build({name: init.name, ordinal: init.ordinal, description: init.description, group_id: init.group_id, slug: init.slug});
    }

    // Existing instance
    if(typeof init === "object" && typeof init.ident === "string") {
      this.instance = init;
    }

  }

  /**
   * Update the definition's task list
   *
   * @param {array} tasks - Array of input tasks
   * @param {boolean} save -
   * @returns {Promise|object} - Resolves with updated instance
   */
  updateTasks(tasks, save=false) {
    return new Promise((resolve, reject) => {

      // Loop over tasks and validate
      _.forEach(tasks, (t) => {
        if(!this.validateTask(t)) throw new InvalidTaskDefinition('Task "' + t.name + '" is not a valid task definition.');

        // Add to validated tasks
        this.validTasks.push(t);
      });

      this.instance.tasks = this.validTasks;

      if(!save) return resolve(this.validTasks);

      if(save) {
        this.instance.save().then(
          (result) => {
            resolve(this.instance);
          },
          (err) => {
            console.log('Failed save state definition');
            throw new FailedCreateQuery('Failed to save/create ')
          }
        )
      }
    });
  }


  /**
   * Validate a task
   *
   * @param {object} task - The task to be validated
   * @returns {boolean}
   */
  validateTask(task) {
    // Check task slug
    if(!/^[A-z0-9_-]*$/g.test(task.slug)) throw new InvalidTaskDefinition('The task "'+task.name+'" name must only contain A-z0-9 and underscores.');

    // Check that the slug is unique
    if(_.find(this.validTasks, {slug: task.slug})) throw new InvalidTaskDefinition('The Task "'+task.name+'" is using a slug that is already in use');

    if(task.outcomeType && this.allowedOutcomeType.indexOf(task.outcomeType) === -1) throw new InvalidTaskDefinition('The task "' + task.name + '" has an unsupported outcome type: ' + task.outcomeType);

    return true;
  }

  /**
   * Update unprotected values
   *
   * @param {object} input - key-value pair object with values to be updated
   */
  setUnprotected(input) {
    if(input.name) this.instance.name = input.name;
    if(input.slug) this.instance.name = input.slug;
    if(input.description) this.instance.description = input.description;
    if(input.ordinal) this.instance.ordinal = input.ordinal;
    if(input.group_id) this.instance.group_id = input.group_id;
  }


};