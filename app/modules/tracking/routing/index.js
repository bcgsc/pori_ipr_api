"use strict";

// app/routes/genomic/detailedGenomicAnalysis.js
const validator           = require('validator');
const express             = require('express');
const router              = express.Router({mergeParams: true});
const acl                 = require(process.cwd() + '/app/middleware/acl');
const _                   = require('lodash');
const db                  = require(process.cwd() + '/app/models');
const RoutingInterface    = require('../../../routes/routingInterface');
let DefinitionRoutes      = require('./definition');
let StateRoutes      = require('./state');
const Generator           = require('./../generate');


/**
 * Create and bind routes for Tracking
 *
 * @type {TrackingRouter}
 */
module.exports = class TrackingRouter extends RoutingInterface {

  constructor(io) {
    super();

    this.io = io;

    // URL Root
    //this.root = '/tracking/';

    // Bind Routes
    let Definitions = new DefinitionRoutes(this.io);
    this.bindRouteObject('/definition', Definitions.getRouter());

    let States = new StateRoutes(this.io);
    this.bindRouteObject('/state', States.getRouter());

    this.registerMiddleware('analysis', require('../../../middleware/analysis'));

    // Enable Generator
    this.generator();

    // Enable Root Racking
    this.tracking();

  }


  /**
   *
   *
   */
  generator() {

    this.registerEndpoint('get', '/POG/:POG/analysis/:analysis([A-z0-9-]{36})/generate', (req,res,next) => {

      // Generate Request
      let generator = new Generator(req.pog, req.analysis, req.user).then(
        (results) => {
          res.json(results);
        },
        (err) => {
          console.log(err);
          res.status(400).json(err);
        }
      );

    });

  }

  tracking() {

    this.registerEndpoint('get', '/', (req,res,next) => {

      // Get all tracking
      db.models.tracking_state.scope('public').findAll({order: [['analysis_id', 'ASC'], ['ordinal', 'ASC']] }).then(
        (states) => {
          res.json(states)
        },
        (err) => {
          console.log(err);
          res.status(500).json({error: {message: 'Unable to retrieve POG tracking states due to an internal error'}});
        }
      )



    });

  }



};