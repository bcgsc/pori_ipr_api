"use strict";

const _                       = require('lodash');
const db                      = require('../../models/');
const InvalidTaskDefinition   = require('./exceptions/InvalidTaskDefinition');
const InvalidStateDefintion   = require('./exceptions/InvalidStateDefinition');
const FailedCreateQuery       = require('../../models/exceptions/FailedCreateQuery');
const moment                  = require('moment');

module.exports = class TrackingGenerator {

  /**
   * Initialize tracking entries for a biopsy
   *
   * @param {object} pog - POG object
   * @param {object} analysis - analysis object
   * @param {object} user - Current user instance
   */
  constructor(pog, analysis, user) {

    this.user         = user;
    this.analysis     = analysis;
    this.pog          = pog;

    return new Promise((resolve, reject) => {

      // Retrieve current set of definitions
      db.models.tracking_state_definition.findAll({where: {hidden: false}}).then(
        (definitions) => {

          let promises = [];

          _.forEach(definitions, (d) => {
            promises.push(this.createState(d));
          });

          Promise.all(promises).then(
            (success) => {

              // All states were created OK
              db.models.tracking_state.findAll({where: {analysis_id: analysis.id}}).then(
                (states) => {

                  // All tracking states made
                  resolve(states);
                },
                (err) => {
                  console.log(err);
                  reject({error: {message: 'Unable to retrieve newly created states'}});
                }
              );

            },
            (err) => {
              reject({error: {message: 'Failed to create all the states', error: err}});
            }
          )

        },
        (reject) => {
          console.log(err);
          reject({error: {message: 'Failed to retrieve all currently defined states'}});
        }
      )

    });
  }

  /**
   * Generate a state entry with a definition
   *
   * @param {object} definition - the definition/template to use
   *
   * @returns {Promise} - Resolves with the model instance
   */
  createState(definition) {
    return new Promise((resolve, reject) => {

      // Create new state
      let newState = {
        analysis_id:  this.analysis.id,
        group_id:     definition.group_id,
        name:         definition.name,
        slug:         definition.slug,
        description:  definition.description,
        ordinal:      definition.ordinal,
        status:       (definition.ordinal === 1) ? 'active' : 'pending',  // Default to start as pending if not ordinal=0
        startedAt:    moment().toISOString(),
        createdBy_id: this.user.id,
      };

      // Create State
      db.models.tracking_state.create(newState)
        .then(
        (state) => {

          let promises = [];

          // Create Tasks
          _.forEach(definition.tasks, (task, i) => {
            promises.push(this.createTask(state, task, i));
          });

          Promise.all(promises)
            .then((tasks) => {
              resolve(tasks);
            })
            .catch((e) => {
              console.log('Create tasks error', e);
              reject({error: {message: 'Unable to create tasks due to: '+ e.error.message}});
              throw new Error('Unable to create tasks');
            });

        },
        (err) => {
          console.log(err);
          // Throw Exception
          reject({error: {message: 'Failed to init tracking, a bad state definition was the cause: ' + err.message}});
          throw new InvalidStateDefintion('Bad state definition, unable to create state: ' + definition.name);
        }
      )

    });
  }

  /**
   * Create a new task instance from a definition
   *
   * @param {object} state - The state the task belongs to
   * @param {object} task - The task definition
   * @param {integer} ordinal - The execution order number for the task
   *
   * @returns {Promise} - Resolves with the task definition
   */
  createTask(state, task, ordinal) {
    return new Promise((resolve, reject) => {

      let newTask = {
        state_id:         state.id,
        name:             task.name,
        slug:             task.slug,
        description:      task.description,
        ordinal:          ordinal,
        status:           task.status,
        checkIns:         0,
        checkInsTarget:   task.checkInsTarget,
      };

      db.models.tracking_state_task.create(newTask).then(
        (task) => {
          resolve(task);
        },
        (err) => {
          reject({error: {message: 'Failed to create task: "' + task.slug + '" due to an SQL error: ' + err.message}});
          console.log(err);
          throw new InvalidTaskDefinition('Unable to create task (sql error)');
        }
      )

    });
  }

};