"use strict";

// app/routes/genomic/detailedGenomicAnalysis.js
const validator           = require('validator');
const express             = require('express');
const router              = express.Router({mergeParams: true});
const acl                 = require(process.cwd() + '/app/middleware/acl');
const _                   = require('lodash');
const db                  = require(process.cwd() + '/app/models');
const RoutingInterface    = require('../../../routes/routingInterface');
const logger              = process.logger;

const Patient             = require(process.cwd() + '/app/libs/patient/patient.library');
const Analysis            = require(process.cwd() + '/app/libs/patient/analysis.library');
const Variants            = require('../germline_small_mutation_variant');
const Review              = require('../germline_small_mutation_review');
const Report              = require('../germline_small_mutation');

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
    this.registerMiddleware('report', require('../middleware/germline_small_mutation.middleware'));
    this.registerMiddleware('review', require('../middleware/germline_small_mutation_review.middleware'));
    this.registerMiddleware('variant', require('../middleware/germline_small_mutation_variant.middleware'));
    
    //let States = new StateRoutes(this.io);
    //this.bindRouteObject('/state', States.getRouter());
    
    //let Tasks = new TaskRoutes(this.io);
    //this.bindRouteObject('/task', Tasks.getRouter());
    
    //let Ticket_Template = new TicketTemplateRoutes(this.io);
    //this.bindRouteObject('/ticket/template', Ticket_Template.getRouter());
    
    // Load Report
    this.registerEndpoint('post', '/patient/:patient/biopsy/:analysis', this.loadReport);
  
    // All Reports
    this.registerEndpoint('get', '/', this.getReports); // All reports for all cases
    this.registerEndpoint('get', '/patient/:patient/biopsy/:analysis', this.getAnalysisReport); // All reports for a biopsy
    
    // Individual Reports
    this.reportResource();
    
    // Variants
    this.reportVariants();
    
    // Reviews
    this.registerEndpoint('put', '/patient/:patient/biopsy/:analysis/report/:report/review', this.addReview); // Add review to report
    this.registerEndpoint('delete', '/patient/:patient/biopsy/:analysis/report/:report/review/:review', this.removeReview); // Add review to report
    
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
    if(!req.body.normal_library) required.normal_library = 'The germline/normal library name is requried, Eg: P12345';
    
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
        return Analysis.retrieveOrCreate(p.id, req.params.analysis, null, {libraries: {normal: req.body.normal_library}});
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
        output.biofx_assigned = req.user;
        
        delete output.id;
        delete output.pog_analysis_id;
        delete output.biofx_assigned_id;
        delete output.deletedAt;
        
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
  
  /**
   * Get All Germline Reports
   *
   * @param {object} req - Express request
   * @param {object} res - Express response
   */
  getReports(req, res) {
    
    // get all reports
    let offset = req.query.offset || 0;
    let limit = req.query.limit || 25;
    
    let opts = {
      order: [['createdAt', 'desc']],
      limit: limit,
      offset: offset
    };
    
    db.models.germline_small_mutation.scope('public').findAndCountAll(opts)
      .then((reports) => {
        res.json({total: reports.count, reports: reports.rows});
      })
      .catch((err) => {
        res.status(500).json({message: 'Unable to retrieve reports'});
        console.log('Unable to retrieve reports', err);
      });
    
  }
  
  /**
   * Get Germline reports for specific biopsy
   *
   * @param {object} req - Express request
   * @param {object} res - Express response
   *
   **/
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
  
  
  /**
   * Add review event for germline report
   *
   * @param {object} req - Express request
   * @param {object} res - Express response
   *
   */
  addReview(req, res) {
    
    if(!req.body.type) return res.status(400).json({message: 'A review type is required in the body.'});
    
    let opts = {
      reviewedBy_id: req.user.id,
      type: req.body.type,
      germline_report_id: req.report.id
    };
    
    // Make sure not already signed
    db.models.germline_small_mutation_review.scope('public').findOne(opts)
      .then((review) => {
        if(review !== null) return res.status(400).json({message: `Report has already been reviewed by ${review.reviewedBy.firstName} ${review.reviewedBy.lastName} for ${req.body.type}`});
        
        // Create new review
        let data = {
          germline_report_id: req.report.id,
          reviewedBy_id: req.user.id,
          type: req.body.type,
          comment: req.body.comment
        };
        
        return db.models.germline_small_mutation_review.create(data);
      })
      .then((review) => {
        if(!res.finished) return Review.public(review.ident);
      })
      .then((review) => {
        res.json(review);
      })
      .catch((err) => {
        res.status(500).json({message: 'Failed to create review entry for this report for internal reasons'});
        console.log(`Failed to create review entry for germline report ${req.report.ident}`, err);
      });
  
  }
  
  /**
   * Remove a review from a report
   *
   * @param {object} req - Express request
   * @param {object} res - Express response
   */
  removeReview(req, res) {
  
    req.review.destroy()
      .then(() => {
        res.status(204).send();
      })
      .catch((e) => {
        res.status(500).json({message: 'Unable to remove the requested germline report'});
      });
    
  }
  
  // Resource endpoints for Variants
  reportVariants() {
    
    this.registerResource('/patient/:patient/biopsy/:analysis/report/:report/variant/:variant')
      .get((req, res) => {
        res.json(req.variant);
      })
      // Toggle variant hidden status
      .put((req, res) => {
        
        // Update Variant details
        req.variant.patient_history = req.body.patient_history;
        req.variant.family_history = req.body.family_history;
        req.variant.hidden = req.body.hidden;
        
        req.variant.save()
          .then(() => {
            res.json(req.variant);
          })
          .catch((e) => {
            res.status(500).json({message: 'Failed to update the variant'});
            console.log(e);
          });
      
      });
    
  }
  
  /**
   * Individual report resources
   *
   */
  reportResource() {
  
    this.registerResource('/patient/:patient/biopsy/:analysis/report/:report')

      /**
       * Get an existing report
       *
       * GET /patient/{patient}/biopsy/{analysis}/report/{report}
       *
       * @urlParam {string} patientID - Patient unique ID (POGID)
       * @urlParam {string} biopsy - Biopsy analysis id (biop1)
       * @urlParam {stirng} report - Report UUID
       *
       *
       */
      .get((req, res) => {
        res.json(req.report);
      })

      /**
       * Update an existing report
       *
       * GET /patient/{patient}/biopsy/{analysis}/report/{report}
       *
       * @urlParam {string} patientID - Patient unique ID (POGID)
       * @urlParam {string} biopsy - Biopsy analysis id (biop1)
       * @urlParam {stirng} report - Report UUID
       *
       * @bodyParam {string} biofx_assigned - ident string of user to be assigned
       * @bodyParam {
       *
       */
      .put((req, res) => {
      
        Report.updateReport(req.report, req.body)
          .then((report) => {
            return Report.public(report.ident);
          })
          .then((report) => {
            res.json(report);
          })
          .catch((e) => {
            logger.error('Failed to update germline report', e);
            res.status(500).json({message: 'Failed to update germline report due to an internal error'});
          });
      
      })
      
      /**
       * Remove an existing report
       *
       * DELETE /patient/{patient}/biopsy/{analysis}/report/{report}
       *
       * @urlParam {string} patientID - Patient unique ID (POGID)
       * @urlParam {string} biopsy - Biopsy analysis id (biop1)
       * @urlParam {stirng} report - Report UUID
       *
       * @param {object} req - Express request
       * @param {object} res - Express response
       */
      .delete((req, res) => {
        req.report.destroy()
          .then(() => {
            res.status(204).send();
          })
          .catch((e) => {
            res.status(500).json({message: 'Unable to remove the requested germline report'});
          });
      });
    
    
  }
};