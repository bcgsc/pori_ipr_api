"use strict";

const express             = require('express');
const router              = express.Router({mergeParams: true});
const db                  = require(process.cwd() + '/app/models');
const _                   = require('lodash');
const RoutingInterface    = require('../../../routes/routingInterface');
const State               = require('../state');
const logger              = require(process.cwd() + '/lib/log');

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
    
    
    this.registerEndpoint('get', `/:state(${this.UUIDregex})/check`, (req,res) => {
  
      // Create object
      let existing = new State(req.state);
      
      existing.checkCompleted().then(
        (result) => {
          res.json({result: result});
        }
      )
      
      
    });

  }

  // URL Root
  rootPath() {

    this.registerResource('/')
      // Get all state definitions
      .get((req,res,next) => {

        let opts = {
          attributes: {
            exclude: ['deletedAt', 'id', 'analysis_id', 'createdBy_id', 'group_id']
          },
          include: [
            {as: 'analysis', model: db.models.pog_analysis.scope('public')},
          ],
          order: [
            ['ordinal', 'ASC']
          ],
          where: {}
        };

        if(req.query.name) opts.where.name = req.query.name;
        if(req.query.slug) opts.where.slug = req.query.slug;

        let taskInclude = {
          as: 'tasks',
          model: db.models.tracking_state_task,
          attributes: {exclude: ['id', 'state_id', 'assignedTo_id']},
          order: [['ordinal','ASC']],
          include: [
            {as: 'assignedTo', model: db.models.user.scope('public')},
            {as: 'checkins', model: db.models.tracking_state_task_checkin, include:[{as: 'user', model: db.models.user.scope('public')}], attributes: {exclude: ['id', 'task_id', 'deletedAt', 'user_id']}}
          ] // end tasks include
        }; // end state tasks include

        if(req.query.unassigned === 'true') taskInclude.where = {assignedTo_id: null};

        opts.include.push(taskInclude);

        // Get All Definitions
        db.models.tracking_state.scope('public').findAll(opts).then(
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

    this.registerResource('/:state('+this.UUIDregex+')')

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

      // Update State
      .put((req, res) => {

        // Create object
        let existing = new State(req.state);
        
        existing.updateAll(req.body).then(
          (result) => {
            res.json(result);
          })
          .catch((err) => {
            console.log('Failed to update');
            console.log(err);
            res.status(400).json({message: 'Failed to update the task', cause: err});
          });
        
      });
  }

  /**
   * Assign user to all state tasks
   *
   */
  assignUser() {

    this.registerEndpoint('put', '/:state('+this.UUIDregex+')/assign/:assignee', (req, res, next) => {

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