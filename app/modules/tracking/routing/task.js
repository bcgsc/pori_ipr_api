"use strict";

const express             = require('express');
const router              = express.Router({mergeParams: true});
const db                  = require(process.cwd() + '/app/models');
const _                   = require('lodash');
const RoutingInterface    = require('../../../routes/routingInterface');
const Task                = require('../task');

module.exports = class TrackingTaskRoute extends RoutingInterface {

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
    this.registerMiddleware('POG', require('../../../middleware/pog'));
    this.registerMiddleware('analysis', require('../../../middleware/analysis'));
    this.registerMiddleware('definition', require('../middleware/definition'));
    this.registerMiddleware('state', require('../middleware/state'));
    this.registerMiddleware('task', require('../middleware/task'));

    // Register Task endpoint
    this.taskPath();

    // Register checkin operation endpoints
    this.checkIns();

  }

  // URL Root
  rootPath() {

    this.registerResource('/')
    // Get all state definitions
      .get((req,res,next) => {
        // Get All Definitions
        db.models.tracking_state_task.scope('public').findAll().then(
          (states) => {
            res.json(states);
          },
          (err) => {
            console.log(err);
            res.status(500).json({error: {message: 'Unable to query definitions'}});
          }
        )
      });

  }


  /**
   * Basic Task Operations
   *
   * DELETE - Remove the task
   * GET - Get the Task
   * PUT - Update the task
   *
   */
  taskPath() {

    this.registerResource('/:task([A-z0-9-_]{3,})')

      // Delete task
      .delete((req, res) => {
        // TODO: Validation on authorization
        req.task.destroy().then(
          (result) => {
            res.status(204).end();
          }
        )
      })

      // Get current definition
      .get((req, res) => {
        let task = req.task.toJSON();
        delete(task.id);
        res.json(task);
      })

      // Update definition
      .put(this.updateTask);

    // Update Task Details
    this.registerEndpoint('put', '/checkin/:POG/:analysis/:state/:task', this.updateTask);

    // Retrieve Task
    this.registerEndpoint('get', '/checkin/:POG/:analysis/:state/:task', (req, res, next) => {
      let response = req.task.toJSON();
      delete response.id;

      res.json(response);
    });

  }

  /**
   * Update task
   *
   * @param res
   * @param req
   * @param next
   */
  updateTask(res, req, next) {
    // Create object
    let existing = new Task(req.task);

    // Update values
    existing.setUnprotected(req.body);

    // Update Tasks & save
    existing.instance.save().then(
      (result) => {
        let response = result.toJSON();
        delete response.id;
        delete response.group_id;
        res.json(result);
      },
      (err) => {
        console.log(err);
        res.status(500).json({error: {message: 'Failed query to update task'}});
      }
    )
  }


  /**
   * Check in a task
   */
  checkIns() {

    this.registerEndpoint('patch', '/checkin/:POG/:analysis/:state/:task', (req, res, next) => {

      // Instantiate the object
      let entry = new Task(req.task);

      // Update
      entry.checkIn(req.body.outcome).then(
        (result) => {
          let response = result.toJSON();
          delete response.id;
          delete response.state_id;
          delete response.assignedTo_id;
          res.json(response);
        },
        (err) => {
          res.status(400).json({error: {message: "Unable to check-in task.", cause: err}});
        })
        .catch((e) => {
          console.log('Error', e);
        });



    });

  }
};