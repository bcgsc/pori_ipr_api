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
let StateRoutes           = require('./state');
let TaskRoutes            = require('./task');
const Generator           = require('./../generate');
const AnalysisLib         = require('../../../libs/structures/analysis');
const POGLib              = require('../../../libs/structures/pog');


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

    // Register Middleware
    this.registerMiddleware('analysis', require('../../../middleware/analysis'));
    this.registerMiddleware('definition', require('../middleware/definition'));
    this.registerMiddleware('state', require('../middleware/state'));
    this.registerMiddleware('task', require('../middleware/task'));


    let States = new StateRoutes(this.io);
    this.bindRouteObject('/state', States.getRouter());

    let Tasks = new TaskRoutes(this.io);
    this.bindRouteObject('/task', Tasks.getRouter());

    // Enable Generator
    this.generator();

    // Enable Root Racking
    this.tracking();

  }


  /**
   * Generate Tracking from source
   *
   */
  generator() {

    // Create parent elements, then initiate tracking
    this.registerEndpoint('post', '/', (req, res, next) => {

      if(!req.body.POGID) return res.status(400).json({error: {message: 'POGID is a required input', code: 'failedValidation', input: 'POGID'}});

      // Create POG
      let pog = new POGLib(req.body.POGID);

      let pogOpts = {
        create: true,
        analysis: false
      };
      
      pog.retrieve(pogOpts).then(
        (pog) => {
          
          let data = {
            pog_id: pog.id,
            libraries: {normal: null, tumour: null, transcriptome: null},
            clinical_biopsy: req.body.clinical_biopsy,
            analysis_biopsy: req.body.analysis_biopsy,
            priority: req.body.priority,
            disease: req.body.disease,
            biopsy_notes: req.body.biopsy_notes
          };
          
          db.models.pog_analysis.create(data).then(
            (analysis) => {

              let generator = new Generator(pog, analysis, req.user).then(
                (results) => {
                  res.json(results);
                },
                (err) => {
                  console.log(err);
                  res.status(400).json(err);
                });

            },
            (err) => {
              console.log(err);
              res.status(400).json({error: {message: 'Unable to create analysis/biopsy entry: ' + err.message, cause: err}});
            }
          );

        },
        (err) => {

        })

    });

    // Generate Tracking Only
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
      ).catch((e) => {
        res.status(500).json({error: {message: 'Tracking initialization failed: ' + e.message}});
      });

    });

  }

  tracking() {

    this.registerEndpoint('get', '/', (req,res,next) => {

      // Get all tracking
      db.models.tracking_state.scope('public').findAll().then(
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