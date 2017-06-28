"use strict";

const express             = require('express');
const router              = express.Router({mergeParams: true});
const db                  = require(process.cwd() + '/app/models');
const _                   = require('lodash');
const RoutingInterface    = require('../../../routes/routingInterface');
const State               = require('../state');

module.exports = class TrackingStateRoute extends RoutingInterface {

  /**
   * Tracking Definitions Routing
   *
   * POG Tracking State routes
   *
   * @param {object} io - Socket.io instance
   */
  constructor(io) {
    super();

    this.io = io;

    // Register middleware
    this.registerMiddleware('state', require('../middleware/state'));

    // Register root
    this.rootPath();

    // Register Definition endpoint
    this.statePath();

    // Assignee Path
    this.assignUser();

  }

  // URL Root
  rootPath() {

    this.registerResource('/')
      // Get all state definitions
      .get((req,res,next) => {
        // Get All Definitions
        db.models.tracking_state.scope('public').findAll().then(
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
   * State Path
   *
   * Delete - Delete a registered state entry
   * Get - Get a specified state
   * Put - Update a specified state
   *
   */
  statePath() {

    this.registerResource('/:state([A-z0-9-]{36})')

    // Delete definition
      .delete((req, res) => {
        req.definition.destroy().then(
          (response) => {
            console.log(response);
            res.status(204);
          }
        )
      })

      // Get current definition
      .get((req, res) => {
        let state = req.state.toJSON();
        delete(state.id);
        res.json(state);
      })

      // Update definition
      .put((req, res) => {

        // Create object
        let existing = new State(req.state);

        // Update values
        existing.setUnprotected(req.body);

        // Update Tasks & save
        existing.setStatus(req.body.status, true).then(
          (result) => {

            let opts = { where: {} };

            if(req.analysis) opts.where.analysis_id = req.analysis.id;

            // Check if it's a UUID
            opts.where.ident = req.state.ident;

            opts.attributes = {exclude: ['deletedAt']};
            opts.limit = 1;
            opts.include = [
              {as: 'tasks', model: db.models.tracking_state_task.scope('public'), attributes: {exclude: ['id', 'state_id', 'assignedTo_id']}, order: [['ordinal','ASC']]}
            ];


            db.models.tracking_state.findOne(opts).then(
              (result) => {
                // Nothing found?
                res.json(result);
              },
              (error) => {
                console.log(error);
                throw new MiddlewareQueryFailed("Unable to looking the requested state.", req, res, "failedTrackingStateMiddlewareQuery");
              }
            );


          },
          (err) => {
            console.log(err);
            res.status(500).json({error: {message: 'Failed query to update state'}});
          }
        )
      });
  }

  /**
   * Assign user to all state tasks
   *
   */
  assignUser() {

    this.registerEndpoint('put', '/:state([A-z0-9-]{36})/assign/:assignee', (req, res, next) => {

      // Create object
      let existing = new State(req.state);

      // Update values
      existing.assignUser(req.params.assignee).then(
        (result) => {
          res.json(result);
        },
        (err) => {
          console.log(err);
          if(err.error && err.error.code && err.error.code === 'userNotFound') return res.status(400).json({error: {message: 'Unable to find the user provided'}});
          res.status(500).json({error: {message: 'Unable to assign the specified user: ' + err.error.message, cause: err }});
        }
      );

    });

  }

};