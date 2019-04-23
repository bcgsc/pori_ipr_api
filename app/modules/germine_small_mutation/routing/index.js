"use strict";

// app/routes/genomic/detailedGenomicAnalysis.js
const validator           = require('validator');
const express             = require('express');
const router              = express.Router({mergeParams: true});
const acl                 = require(process.cwd() + '/app/middleware/acl');
const _                   = require('lodash');
const db                  = require(process.cwd() + '/app/models');
const RoutingInterface    = require('../../../routes/routingInterface');
const logger              = require('../../../../lib/log');
const Excel               = require('exceljs');
const FastCSV             = require('fast-csv');

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
    this.registerMiddleware('gsm_report', require('../middleware/germline_small_mutation.middleware'));
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
    this.registerEndpoint('put', '/patient/:patient/biopsy/:analysis/report/:gsm_report/review', this.addReview); // Add review to report
    this.registerEndpoint('delete', '/patient/:patient/biopsy/:analysis/report/:gsm_report/review/:review', this.removeReview); // Add review to report
    
    // Export
    this.registerEndpoint('get', '/export/batch/token', this.getExportFlashToken);
    this.registerEndpoint('get', '/export/batch', this.batchExport);
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
    
    let opts = {
      order: [['id', 'desc']],
      where: {}
    };
        
    if(req.query.search) opts.where['$analysis.pog.POGID$'] = {$ilike: `%${req.query.search}%` };
    if(req.query.project) opts.where['$analysis.pog.projects.name$'] = req.query.project;

    
    db.models.germline_small_mutation.scope('public').findAndCountAll(opts)
      .then((result) => {

        let reports = result.rows;

        // If user is in projects group, filter for reports that have been reviewed by biofx
        if(_.find(req.user.groups, {name: 'Projects'})) {
          reports = _.filter(reports, function(record) {
            if(_.filter(record.reviews, {type: 'biofx'}).length > 0) return true;
            return false;
          });
          
          result.count = reports.length;
        }
        
        // Need to take care of limits and offsets outside of query to support natural sorting
        let limit = parseInt(req.query.limit) || 25; // Gotta parse those ints because javascript is javascript!
        let offset = parseInt(req.query.offset) || 0;

        // Reverse natural sort by POGID
        reports.sort(function(a,b) {
          return b.analysis.pog.POGID.localeCompare(a.analysis.pog.POGID, undefined, {numeric: true, sensitivity: 'base'});
        });

        // apply limit and offset to results
        let start = offset,
            finish = offset + limit;
        let rows = reports.slice(start, finish);

        res.json({total: result.count, reports: rows});
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
      where: {
        reviewedBy_id: req.user.id,
        type: req.body.type,
        germline_report_id: req.report.id
      }
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
    
    this.registerResource('/patient/:patient/biopsy/:analysis/report/:gsm_report/variant/:variant')
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
  
    this.registerResource('/patient/:patient/biopsy/:analysis/report/:gsm_report')

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
            res.json(report[0]);
          })
          .catch((e) => {
            logger.error('Failed to update germline report', e);
            res.status(500).json({message: 'Failed to update germline report due to an internal error'});
            console.log(e);
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
  
  
  /**
   * Generate Batch Export
   *
   * Get a batch export of all report variants that have not been exported yet
   *
   * GET /export/batch
   *
   * @urlParam optional {string} reviews - Comma separated list of reviews required for export
   *
   * @param {object} req - Express request
   * @param {object} res - Express response
   */
  batchExport(req, res) {
    
    // Where clauses
    let opts = {
      where: {
        exported: false
      }
    };
    
    if(!req.query.reviews) req.query.reviews = "";
    
    // Build list of reports that have been reviewed by both projects and biofx
    db.models.germline_small_mutation.scope('public').findAll(opts)
      .then((exports) => {
        
        let variants = [];
        
        // Loop through reports, and ensure they have all required reviews
        _.forEach(exports, (r, i) => {
          // Ensure all required reviews are present on report
          
          if(_.intersection(req.query.reviews.split(','), _.map(r.reviews, (re) => { return re.type})).length > req.query.reviews.split(',').length) return;
          
          // Add samples name for each variant
          let parsed_variants = _.map(r.variants, (v) => {
            
            // Watch for hidden rows
            if(v.hidden) return;
            
            let process_variant = _.assign({sample: r.analysis.pog.POGID + '_' + r.analysis.libraries.normal}, v.toJSON());
            
            //return Variants.processVariant(Variants.createHeaders(), process_variant);
            return process_variant;
          });
          
          variants = variants.concat(parsed_variants);
          
        });
        
        
        // Prepare export
        let workbook = new Excel.Workbook();
        
        workbook.creator = 'BC Genome Sciences Center - BC Cancer Agency - IPR';
        workbook.created = new Date();
        
        let sheet = workbook.addWorksheet('Exports');
        
        sheet.columns = Variants.createHeaders();
        
        _.forEach(variants, (v) => {
          sheet.addRow(v);
        });
        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=${new Date()}.ipr.germline.export.xlsx`);
        
        workbook.xlsx.write(res)
          .then(() => {
            res.end();
          })
          .catch((e) => {
            res.status(500).json({message: 'Failed to create xlsx export of recent reports'});
            console.log(e);
          })
          
        
        
        //console.log('Variants', variants);
        /*
        FastCSV.writeToString(variants, {headers: true}, (err, data) => {
          res.setHeader('Content-Type', 'application/CSV');
          res.setHeader('Content-Disposition', 'attachment; filename="test.csv"');
          res.send(data);
          res.end();
        }); */
        
      
      })
      .catch((err) => {
        logger.error(`Failed to generate export: ${err.message}`);
        console.log('Failed to generate export: ', err);
        res.status(500).json({message: 'Failed to generate export due to internal server error'});
      });
  
  }
  
  /**
   * Generate a flash token for exporting reports
   *
   * Get a batch export of all report variants that have not been exported yet
   *
   * GET /export/batch/token
   *
   * @param {object} req - Express request
   * @param {object} res - Express response
   */
  getExportFlashToken(req, res) {
    
    // Generate Token
    db.models.flash_token.create({user_id: req.user.id, resource: 'gsm_export'})
      .then((result) => {
        res.json({token: result.token});
      })
      .catch((e) => {
        res.status(500).json({message:'Failed to generated download request'});
        console.log(e);
      });
  }
  
};