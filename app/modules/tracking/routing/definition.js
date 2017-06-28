"use strict";

const express             = require('express');
const router              = express.Router({mergeParams: true});
const db                  = require(process.cwd() + '/app/models');
const _                   = require('lodash');
const RoutingInterface    = require('../../../routes/routingInterface');
const StateDefinition     = require('../definition');

module.exports = class TrackingDefinitionRoute extends RoutingInterface {

  /**
   * Tracking Definitions Routing
   *
   * POG Tracking State Definitions routes
   *
   * @param {object} io - Socket.io instance
   */
  constructor(io) {
    super();

    this.io = io;

    // Register middleware
    this.registerMiddleware('definition', require('../middleware/definition'));

    // Register root
    this.rootPath();

    // Register Definition endpoint
    this.definitionPath();

  }

  // URL Root
  rootPath() {

    this.registerResource('/')
      // Create new state definition
      .post((req,res,next) => {

        // Create new definition entry
        let entry = new StateDefinition(req.body);

        // Add entries
        entry.updateTasks(req.body.tasks)
          .then(entry.instance.save.bind(entry.instance))
          .then(
            (result) => {

              db.models.tracking_state_definition.scope('public').findOne({where: {ident: result.ident}}).then(
                (definition) => {
                  res.status(201).json(definition);
                },
                (err) => {
                  console.log(err);
                  res.status(500).json({error: {message: 'Entry created, but failed to retrieve after being created. '}})
                }
              )

            })
          .catch((e) => {
            res.status(500).json({error: {message: e.message}, exception: e.constructor.name});
          });

      })
      // Get all state definitions
      .get((req,res,next) => {

        let opts = {
          where: {}
        };

        opts.where = (req.query.hidden && req.query.hidden === 'true') ? {} : {hidden: false};

        // Get All Definitions
        db.models.tracking_state_definition.scope('public').findAll(opts).then(
          (definitions) => {
            res.json(definitions);
          },
          (err) => {
            console.log(err);
            res.status(500).json({error: {message: 'Unable to query definitions'}});
          }
        )
      });

  }

  definitionPath() {

    this.registerResource('/:definition([A-z0-9-]{36})')

      // Delete definition
      .delete((req, res) => {
        req.definition.destroy().then(
          (response) => {
            res.status(204);
          }
        )
      })

      // Get current definition
      .get((req, res) => {
        let definition = req.definition.toJSON();
        delete(definition.id);
        res.json(definition);
      })

      // Update definition
      .put((req, res) => {

        // Create object
        let existing = new StateDefinition(req.definition);

        // Update values
        existing.setUnprotected(req.body);

        // Update Tasks & save
        existing.updateTasks(req.body.tasks, true).then(
          (result) => {
            let response = result.toJSON();
            delete response.id;
            delete response.group_id;
            res.json(response);
          },
          (err) => {
            console.log(err);
            res.status(500).json({error: {message: 'Failed query to update definitions'}});
          }
        )

      });
  }
};