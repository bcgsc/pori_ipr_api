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

    // No existing instance
    if(init === null) this.instance = this.model.build();

    // New instance with passed values
    if(typeof init === 'object' && init.ident === undefined) {
      console.log('New instance with prefills');
      this.instance = this.model.build({name: init.name, ordinal: init.ordinal, description: init.description, group_id: init.group_id});
    }

    // Existing instance
    if(typeof init === "object" && typeof init.ident === "string") {
      console.log('Existing object');
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

      let validTasks = [];

      // Loop over tasks and validate
      _.forEach(tasks, (t) => {
        if(!this.validateTask(t)) throw new InvalidTaskDefinition('Task "' + t.name + '" is not a valid task definition.');

        // Check for duplicate names
        if(_.find(validTasks, {name: t.name})) throw new InvalidTaskDefinition('Duplicate name for task: "' + t.name + '" found.');

        // Add to validated tasks
        validTasks.push(t);
      });

      this.instance.tasks = validTasks;

      if(!save) return resolve(validTasks);

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
   * @param task
   * @returns {boolean}
   */
  validateTask(task) {

    // Check task name
    if(!/^[A-z0-9_-]*$/g.test(task.name)) throw new InvalidTaskDefinition('The task name must only contain A-z0-9 and underscores.');

    return true;

  }

  /**
   * Update unprotected values
   *
   * @param {object} input - key-value pair object with values to be updated
   */
  setUnprotected(input) {
    if(input.name) this.instance.name = input.name;
    if(input.description) this.instance.description = input.description;
    if(input.ordinal) this.instance.ordinal = input.ordinal;
    if(input.group_id) this.instance.group_id = input.group_id;
  }


};