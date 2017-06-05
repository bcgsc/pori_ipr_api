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
            let response = result.toJSON();
            delete response.id;
            delete response.group_id;
            res.json(result);
          },
          (err) => {
            console.log(err);
            res.status(500).json({error: {message: 'Failed query to update state'}});
          }
        )
      });
  }
};