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

    // User Assignment
    this.assignUser();

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
      .put(this.updateTask.bind(this));

    // Update Task Details
    this.registerEndpoint('put', '/:POG/:analysis/:state/:task', this.updateTask.bind(this));
    this.registerEndpoint('put', '/:task([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})', this.updateTask.bind(this));

    // Retrieve Task
    this.registerEndpoint('get', '/:POG/:analysis/:state/:task', (req, res, next) => {
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
  updateTask(req, res, next) {

    // Create object
    let existing = new Task(req.task);

    // Update values
    existing.setUnprotected(req.body);

    // Update Tasks & save
    existing.instance.save()
      .then(existing.getPublic.bind(existing))
      .then(
      (result) => {
        res.json(result);
        this.io.emit('taskStatusChange', result);
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

    // Checkin by pog/analysis(biospec, or biop)/state_slug/task_slug
    this.registerEndpoint('patch', '/checkin/:POG/:analysis/:state/:task', (req, res, next) => {

      // Instantiate the object
      let entry = new Task(req.task);

      // Update
      entry.checkIn(req.user, req.body.outcome).then(
        (result) => {
          let response = result.toJSON();
          delete response.id;
          delete response.state_id;
          delete response.assignedTo_id;
          res.json(response);

          this.io.emit('taskStatusChange', response);
        },
        (err) => {
          console.log(err);
          let response = {message: 'Unable to check-in task: ' + err.message};
          if(err.code) response.code = err.code;
          res.status(400).json(response);

        })
        .catch((e) => {
          console.log('Error', e);
        });

    });

    // Checkin by ident
    this.registerEndpoint('patch', '/checkin/:task([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})', (req, res, next) => {

      let entry = new Task(req.task);

      // Update
      entry.checkIn(req.user, req.body.outcome).then(
        (result) => {
          let response = result.toJSON();
          delete response.id;
          delete response.state_id;
          delete response.assignedTo_id;
          res.json(response);
        },
        (err) => {
          console.log(err);
          res.status(400).json({error: {message: "Unable to check-in task.", cause: err}});
        })
        .catch((e) => {
          console.log('Error', e);
        });

    });

    // Cancel a check-in
    this.registerEndpoint('delete', '/checkin/:task('+this.UUIDregex+')/:checkin/:all?', (req, res, next) => {

      let entry = new Task(req.task);

      let outcomes = (req.params.checkin.indexOf(',')) ? req.params.checkin.split(',') : [req.params.checkin];
      let all = (req.params.all);

      entry.cancelCheckIn(outcomes, all).then(
        (result) => {
          res.json(result);
        },
        (err) => {
          console.log('Error', err);
          res.status(500).json({error: {message: "Unable to revoke check-in.", cause: err}});
        }
      )


    });

  }


  /**
   * Assign a user to a task
   */
  assignUser() {

    this.registerEndpoint('put', '/:task('+this.UUIDregex+')/assignTo/:user('+this.UUIDregex+')', (req,res,next) => {

      let entry = new Task(req.task);

      entry.setAsignedTo(req.params.user).then(
        (result) => {
          res.json(result);
        },
        (err) => {
          console.log(err);
          res.status(400).json({error: {message: 'Unable to update assigned user.', cause: err}});
        })
        .catch((e) => {
          res.status(400).json({error: {message: 'Unable to update the assigned user: ' + e.message, cause: e}});
        });

    })

  }

};