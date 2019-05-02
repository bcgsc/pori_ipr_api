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
const moment              = require('moment');

const Variants            = require('../germline_small_mutation_variant');

/**
 * Create and bind routes for Germline Small Mutations Module
 *
 * @type {TrackingRouter}
 */
module.exports = class GSMDownloadRouter extends RoutingInterface {
  
  constructor(io) {
    super();
    
    this.io = io;
    
    // URL Root
    //this.root = '/tracking/';
    
    // Export
    this.registerEndpoint('get', '/batch/download', this.tokenAuth); // Pseudo middleware. Runs before subsequent
    this.registerEndpoint('get', '/batch/download', this.batchExport);
  }
  
  /**
   * Flash Token Authentication and user injection
   *
   * @param {object} req
   * @param {object} res
   * @param {object} next
   */
  tokenAuth(req, res, next) {
    
    // Check for authentication token
    if(!req.query.flash_token) return res.status(403).json({message: 'A flash token is required in the url parameter: flash_token'});
    
    db.models.flash_token.findOne({where: {token: req.query.flash_token}, include: [{ model: db.models.user, as: 'user' }]})
      .then((resp) => {
        
        if(resp === null) return res.status(403).json({message: 'A valid flash token is required to download reports'});
      
        req.user = resp.user;
        req.flash_token = resp;
        
        next();
        
        resp.destroy();
      })
      .catch((e) => {
        res.status(500).json({message: 'Failed to query for flash token provided'});
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
    
    if(!req.flash_token) res.status(403).send();
    
    // Where clauses
    let opts = {
      where: {
        exported: false
      },
      include: [
        {model: db.models.pog_analysis, as: 'analysis', include: [ {as:'pog', model: db.models.POG.scope('public')} ]},
        { as: 'variants', model: db.models.germline_small_mutation_variant, separate: true, order: [['gene', 'asc']] },
        { as: 'reviews', model: db.models.germline_small_mutation_review, separate: true, include: [ {model: db.models.user.scope('public'), as: 'reviewedBy'} ] }
      ]
    };
    
    let reports = {};
    let landscapes = {};
    
    if(!req.query.reviews) req.query.reviews = "";
    
    // Build list of reports that have been reviewed by both projects and biofx
    db.models.germline_small_mutation.findAll(opts)
      .then((rs) => {
        reports = rs;
        
        let opts = {
          order: [['updatedAt', 'DESC']], // Gets us the most recent report worked on.
          include: [
            {model: db.models.analysis_report, as: 'report' },
          ],
          where: {
            '$report.analysis_id$': {
              $in: _.map(reports, (r) => { return r.analysis.id; })
            },
            '$report.state$': {
              $in: ['presented', 'active', 'archived']
            }
          }
        };
        
        return db.models.tumourAnalysis.findAll(opts);
      })
      .then((ta) => {
        
        landscapes = ta; // Tumour Analysis containing mutation landscapes
        let variants = [];
        
        // Loop through reports, and ensure they have all required reviews
        _.forEach(reports, (r, i) => {
          // Ensure all required reviews are present on report
          if(_.intersection(req.query.reviews.split(','), _.map(r.reviews, (re) => { return re.type})).length !== req.query.reviews.split(',').length) return;
          
          
          // Add samples name for each variant
          let parsed_variants = _.map(r.variants, (v) => {
            
            // Find mutation landscape
            let find = false;
            
            _.forEach(landscapes, (l) => {
              if(l.report.analysis_id === r.pog_analysis_id) find = l;
            });
            
            // Parse Mutation Landscape JSON array. Show modifier if there is one. Show associations if set. If sig has no associations, show number.
            let parseMl = (arr) => {
              return _.join(_.map(arr, (ls) => { return `${ls.modifier} ${(ls.associations !== '-') ? ls.associations : 'Signature ' + ls.signature}`}), '; ');
            };
            
            let ml = (find) ? parseMl(find.mutationSignature) : 'N/A';
            
            // Watch for hidden rows
            if(v.hidden === false) return _.assign({sample: r.analysis.pog.POGID + '_' + r.analysis.libraries.normal, biopsy: r.analysis.analysis_biopsy, mutation_landscape: ml}, v.toJSON());
          });
          
          variants = variants.concat(parsed_variants);
          
        });
        
        // Removes skipped rows
        variants = _.filter(variants, (i) => { return (i) });
        
        // Prepare export
        let workbook = new Excel.Workbook();
        
        workbook.subject = `Germline Small Mutation Reports Batch Export - ${moment().format('YYYY-MM-DD')}`;
        workbook.creator = `Integrated Pipeline Reports - C/O ${req.user.firstName + ' ' + req.user.lastName}`;
        workbook.company = 'BC Cancer Agency - Michael Smith Genome Sciences Center';
        workbook.comment = 'For research purposes only';
        workbook.created = new Date();
        
        let sheet = workbook.addWorksheet('Exports');
        
        sheet.columns = Variants.createHeaders();
        
        _.forEach(variants, (v) => {
          sheet.addRow(v);
        });
        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=${moment().format('YYYY-MM-DD')}.ipr.germline.export.xlsx`);
        
        workbook.xlsx.write(res)
          .then(() => {
            // Mark all exported reports in DB
            return Promise.all(_.map(reports, (r) => {
              // Check if report was exported
              if(_.intersection(req.query.reviews.split(','), _.map(r.reviews, (re) => { return re.type})).length !== req.query.reviews.split(',').length) return;
              
              r.exported = true;
              return r.save();
            }))
          })
          .then(() => {
            res.end();
          })
          .catch((e) => {
            res.status(500).json({message: 'Failed to create xlsx export of recent reports'});
            console.log(e);
          });
        
      })
      .catch((err) => {
        logger.error(`Failed to generate export: ${err.message}`);
        console.log('Failed to generate export: ', err);
        res.status(500).json({message: 'Failed to generate export due to internal server error'});
      });
    
  }
  
};