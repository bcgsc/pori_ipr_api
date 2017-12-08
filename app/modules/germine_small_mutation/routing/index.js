"use strict";

// app/routes/genomic/detailedGenomicAnalysis.js
const validator           = require('validator');
const express             = require('express');
const router              = express.Router({mergeParams: true});
const acl                 = require(process.cwd() + '/app/middleware/acl');
const _                   = require('lodash');
const db                  = require(process.cwd() + '/app/models');
const RoutingInterface    = require('../../../routes/routingInterface');

const Patient             = require(process.cwd() + '/app/libs/patient/patient.library');
const Analysis            = require(process.cwd() + '/app/libs/patient/analysis.library');
const Variants            = require('../germline_small_mutation_variant');

/**
 * Create and bind routes for Germline Small Mutations Module
 *
 * @type {TrackingRouter}
 */
module.exports = class GSMRouter extends RoutingInterface {
  
  constructor(io) {
    super();
    
    this.io = io;
    
    // URL Root
    //this.root = '/tracking/';
    
    // Register Middleware
    //this.registerMiddleware('analysis', require('../../../middleware/analysis'));
    //this.registerMiddleware('definition', require('../middleware/definition'));
    
    //let States = new StateRoutes(this.io);
    //this.bindRouteObject('/state', States.getRouter());
    
    //let Tasks = new TaskRoutes(this.io);
    //this.bindRouteObject('/task', Tasks.getRouter());
    
    //let Ticket_Template = new TicketTemplateRoutes(this.io);
    //this.bindRouteObject('/ticket/template', Ticket_Template.getRouter());
    
    this.registerEndpoint('post', '/patient/:patient/biopsy/:analysis', this.loadReport);
    this.registerEndpoint('get', '/patient/:patient/biopsy/:analysis', this.getAnalysisReport);
    
    this.registerEndpoint('get', '/', this.getReports);
    
    this.registerEndpoint('post', '/patient/:patient/biopsy/:analysis/review', this.addReview);
  }
  
  /**
   * Load Germline Report
   *
   * /POG/{POGID}/analysis/{analysis}
   *
   *
   * @param {object} req - Express request
   * @param {object} res - Express response
   */
  loadReport(req, res) {
  
    // Check for required values
    let required = {};
    if(!req.params.analysis) required.analysis = 'A bioapps biopsy/analysis value is required. Eg: biop1';
    if(!req.body.source) required.source = 'The source file path is required';
    if(!req.body.version) required.version = 'The source file version is required. Eg: v0.0.1';
    if(!req.params.patient) required.patient = 'The patient identifier is required. Eg: POG1234';
    if(!req.body.rows) required.rows = 'Data rows are required for import. Empty arrays are valid.';
    if(!req.body.project) required.project = 'Project name is required to load a report';
    
    if(_.keys(required).length > 0) return res.status(400).json({message: 'Required fields were missing.', fields: required});
    
    let patient;
    let analysis;
    let report;
    let public_report;
    
    // Retrieve POG and Analysis
    Patient.retrieveOrCreate(req.params.patient, req.body.project)
      
      // Create or retrieve patient object
      .then((p) => {
        patient = p;
        return Analysis.retrieveOrCreate(p.id, req.params.analysis);
      })
      
      // Create or Retrieve Biopsy Analysis
      .then((a) => {
        analysis = a;
        
        // Begin creating Report
        let report = {
          pog_analysis_id: analysis.id,
          source_version: req.body.version,
          source_path: req.body.source,
          biofx_assigned_id: req.user.id
        };
        
        return db.models.germline_small_mutation.create(report);
        
      })
      // Create Small Mutation Report object
      .then((r) => {
        report = r;
  
        // Prepare Rows with processing
        let rows = Variants.processVariants(report, req.body.rows);
        
        return db.models.germline_small_mutation_variant.bulkCreate(rows);
      })
      // Get Full public object
      .then((rows) => {
        
        let output = report.toJSON();
        output.analysis = analysis.toJSON();
        output.analysis.pog = patient.toJSON();
        output.variants = rows;
        
        res.json(output);
      })
      // Catch failures & errors
      .catch((err) => {
        // Cleanup
        db.models.germline_small_mutation.destroy({where: {pog_analysis_id: analysis.id}});
      
        if(_.find(err.errors, {type: 'unique violation'})) return res.status(400).json({message: `A report for ${patient.POGID} with version ${req.body.version} already exists`});
      
        res.status(500).json({message: `Failed to import report: ${err.message}`, error: err});
        console.log('Failed to import germline report', err);
      });
  }
  
  getReports(req, res) {
    
    // get all reports
    let offset = req.query.offset || 0;
    let limit = req.query.limit || 25;
    
    let opts = {
      order: [['createdAt', 'desc']],
      limit: limit,
      offset: offset
    };
    
    db.models.germline_small_mutation.scope('public').findAll(opts)
      .then((reports) => {
        res.json(reports);
      })
      .catch((err) => {
        res.status(500).json({message: 'Unable to retrieve reports'});
        console.log('Unable to retrieve reports', err);
      });
    
  }
  
  getAnalysisReport(req, res) {
    
    let opts = {
      order:  [['createdAt', 'desc']],
      attributes: {
        exclude: ['deletedAt', 'id', 'pog_analysis_id', 'biofx_assigned_id']
      },
      include: [
        { as: 'analysis', model: db.models.pog_analysis.scope('public'), where: { analysis_biopsy: req.params.analysis }, include: [ { model: db.models.POG, as: 'pog', where: { POGID: req.params.patient }} ] },
        { as: 'biofx_assigned', model: db.models.user.scope('public') },
        { as: 'variants', model: db.models.germline_small_mutation_variant, separate: true },
        { as: 'reviews', model: db.models.germline_small_mutation_review, separate: true, include: [ {model: db.models.user.scope('public'), as: 'reviewedBy'} ] }
      ]
    };
    
    db.models.germline_small_mutation.scope('public').findAll(opts)
      .then((reports) => {
        res.json(reports);
      })
      .catch((err) => {
        res.status(500).json({message: 'Unable to retrieve reports'});
        console.log('Unable to retrieve reports', err);
      });
  }
  
  
  addReview(req, res) {
  
  
  
  }
  
};