"use strict";

// app/routes/genomic/detailedGenomicAnalysis.js
const express             = require('express');
const acl                 = require(process.cwd() + '/app/middleware/acl');
const _                   = require('lodash');
const db                  = require(process.cwd() + '/app/models');
const RoutingInterface    = require('../../../routes/routingInterface');
const AnalysisLib         = require('../../../libs/structures/analysis');
const POGLib              = require('../../../libs/structures/pog');
const Generator           = require('../../tracking/generate');


/**
 * Create and bind routes for Tracking
 *
 * @type {TrackingRouter}
 */
module.exports = class TrackingRouter extends RoutingInterface {
  
  constructor(io) {
    super();
    
    this.io = io;
    
    // Register Middleware
    this.registerMiddleware('analysis', require('../../../middleware/analysis'));
    
    this.registerResource('/')
      .get((req, res, next) => {
        
        let opts = {
          limit: 20,
          offset: req.query.offset || 0,
          order: [['createdAt', 'DESC']],
          include: [
            {as: 'analysis', model: db.models.analysis_report, separate: true}
          ],
          where: {}
        };
        
        let pog_include = { as: 'pog', model: db.models.POG.scope('public'), where: {} };
        if(req.query.search) pog_include.where.POGID = {$ilike: `%${req.query.search}%` };
        if(req.query.project) pog_include.where.project = req.query.project;
        
        opts.include.push(pog_include);
        
        // Execute Query
        db.models.pog_analysis.findAll(opts)
          .then((result) => {
            res.json(result);
          })
          .catch((err) => {
            console.log(err);
            res.status(500).json({message: 'Unable to fulfill the request for biopsies/analyses'});
          });
      
      })
      // Add Biopsy/Analysis entry
      .post((req, res, next) => {
        
        // Gather and verify information
        let analysis = {};
        let validition = {
          state: true,
          invalid: []
        };
        
        // Require Fields
        if(!req.body.clinical_biopsy) {
          validition.state = false;
          validition.invalid.push("A clinical biopsy value is required");
        }
        if(!req.body.POGID) {
          validition.state = false;
          validition.invalid.push("A valid POGID is required");
        }
        if(!req.body.disease) {
          validition.state = false;
          validition.invalid.push("A valid disease type is required");
        }
        
        if(!validition.state) {
          res.status(400).json({message: 'Invalid inputs supplied', cause: validition.invalid});
          return;
        }
        
        let POG = new POGLib(req.body.POGID);
        
        POG.retrieve({create: true, analysis: false})
          .then((pog) => {
            
            analysis.pog_id = pog.id;
            analysis.clinical_biopsy = req.body.clinical_biopsy;
            analysis.disease = req.body.disease;
            analysis.biopsy_notes = req.body.biopsy_notes;
            analysis.notes = req.body.notes;
            
            if(req.body.libraries && (req.body.libraries.tumour || req.body.libraries.transcriptome || req.body.libraries.normal)) {
              analysis.libraries = req.body.libraries;
            }
            
            if(req.body.analysis_biopsy) analysis.analysis_biopsy = req.body.analysis_biopsy;
            
            return db.models.pog_analysis.create(analysis);
            
          })
          .then((analysis) => {
            
            // Generate Tracking if selected.
            if(req.body.tracking) {
              
              // Initiate Tracking Generator
              let generator = new Generator(POG.instance, analysis, req.user)
                .then((results) => {
                  analysis = analysis.toJSON();
                  analysis.pog = POG.instance;
                  res.json(analysis);
                })
                .catch((err) => {
                  console.log(err);
                  res.status(400).json(err);
                });
              
            } else {
              analysis = analysis.toJSON();
              analysis.pog = POG.instance;
              res.json(analysis);
            }
          })
          .catch((err) => {
            res.status(500).json({message: 'Something went wrong, we were unable to add the biopsy: ' + err.message});
            console.log(err);
          });
        
      
      });
  }
  
};