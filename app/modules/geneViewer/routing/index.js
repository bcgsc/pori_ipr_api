"use strict";

// app/routes/genomic/detailedGenomicAnalysis.js
const validator           = require('validator');
const express             = require('express');
const router              = express.Router({mergeParams: true});
const acl                 = require(process.cwd() + '/app/middleware/acl');
const _                   = require('lodash');
const db                  = require(process.cwd() + '/app/models');
const RoutingInterface    = require('../../../routes/routingInterface');
const GeneViewer          = require('../geneViewer');


/**
 * Create and bind routes for Tracking
 *
 * @type {TrackingRouter}
 */
module.exports = class GeneViewRouter extends RoutingInterface {
  
  constructor(io) {
    super();
    
    this.io = io;
   
    // Register Middleware
    this.registerMiddleware('report', require(process.cwd() + '/app/middleware/analysis_report'));
    this.registerMiddleware('pog', require(process.cwd() + '/app/middleware/pog'));
    
    this.registerEndpoint('get', '/:gene', (req, res) => {
    
      let viewer = new GeneViewer(req.POG, req.report, req.params.gene);
      
      viewer.getAll().then(
        (result) => {
          res.json(viewer.results);
        }
      ).catch((err) => {
        console.log('Error', err);
      });
    
    });
    
    
  }
  
  
};