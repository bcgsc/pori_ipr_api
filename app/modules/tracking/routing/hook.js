"use strict";

const express             = require('express');
const router              = express.Router({mergeParams: true});
const db                  = require(process.cwd() + '/app/models');
const _                   = require('lodash');
const RoutingInterface    = require('../../../routes/routingInterface');
const Hook                = require('../hook');

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
    this.registerMiddleware('hook', require('../middleware/hook'));

    // Register root
    this.rootPath();

    // Register Definition endpoint
    this.hookPath();

    // Task User Loads
    //this.userAssignmentLoad();

  }

  // URL Root
  rootPath() {

    this.registerResource('/')
      
      // Create new state definition
      .get((req,res,next) => {
      
        let opts = {where:{}};
        
        if(req.query.state) opts.where.state_name = req.query.state;
        
        // Add entries
        db.models.tracking_hook.findAll(opts)
          .then((results) => {
            res.json(results);
          })
          .catch((e) => {
            res.status(500).json({error: 'Failed to retrieve all hooks'});
          });

      })
      
      // Get all state definitions
      .post((req,res,next) => {
        
        // Requireds
        if(!req.body.name) return res.status(400).json({message: 'Hook name is required'});
        if(!req.body.state_name) return res.status(400).json({message: 'State slug name is required'});
        if(!req.body.status) return res.status(400).json({message: 'Transition to status is required'});
        if(!req.body.action) return res.status(400).json({message: 'Action type for hook is required'});
        if(!req.body.target) return res.status(400).json({message: 'List of targets is required'});
        if(!req.body.payload) return res.status(400).json({message: 'A payload/body is required'});
        if(!req.body.enabled) return res.status(400).json({message: 'Enabled true/false is required'});
      
        // Get All Definitions
        db.models.tracking_hook.create(req.body)
          .then((definitions) => {
            res.json(definitions);
          })
          .catch((err) => {
            console.log(err);
            res.status(500).json({error: {message: 'Unable to query definitions'}});
          });
      });

  }

  hookPath() {
    
    this.registerResource('/:hook([A-z0-9-]{36})')

      // Delete definition
      .delete((req, res) => {
      
        db.models.tracking_hook.destroy({where: {ident: req.hook.ident}})
          .then(() => {
            res.status(204).send();
          })
          .catch((e) => {
            console.log('Failed to remove hook', e);
            res.status(500).json({message: 'Failed to remove hook'});
          });
        
      })

      // Get current definition
      .get((req, res) => {
        let hook = req.hook.toJSON();
        delete(hook.id);
        res.json(hook);
      })

      // Update definition
      .put((req, res) => {
        
        let data = {};
        
        if(req.body.name) data.name = req.body.name;
        if(req.body.state_name) data.state_name = req.body.state_name;
        if(req.body.task_name) data.task_name = req.body.task_name;
        if(req.body.status) data.status = req.body.status;
        if(req.body.action) data.action = req.body.action;
        if(req.body.target) data.target = req.body.target;
        if(req.body.payload) data.payload = req.body.payload;
        if(req.body.enabled) data.enabled = req.body.enabled;
        
        db.models.tracking_hook.update(data, { where: {ident: req.hook.ident}})
          .then((result) => {
            return db.models.tracking_hook.scope('public').findOne({where: {ident: req.hook.ident}});
          })
          .then((result) => {
            res.json(result);
          })
          .catch((e) => {
            res.status(500).json({message: 'Failed to update the hook'});
            console.log(e);
          })
      

      });
  }
  
  
};