"use strict";

// app/routes/genomic/detailedGenomicAnalysis.js
const validator           = require('validator');
const express             = require('express');
const router              = express.Router({mergeParams: true});
const acl                 = require(process.cwd() + '/app/middleware/acl');
const _                   = require('lodash');
const db                  = require(process.cwd() + '/app/models');
const RoutingInterface    = require('../../../routes/routingInterface');

/**
 * Create and bind routes for Recent Reports
 *
 * @type {RecentReportsRouting}
 */
module.exports = class RecentReportsRouting extends RoutingInterface {
  
  constructor(io) {
    super();
    
    this.io = io;
    
    // Enable Root Racking
    this.rootRoutes();
    
    // Enable resource entry
    this.resource();
    
  }
  
  /**
   * Recent Reports Root
   *
   */
  rootRoutes() {
    
    this.registerResource('/')
      // Retrieve all recent report entries
      .get((req,res) => {
      
        let opts = {
          where: {
            user_id: req.user.id
          }
        };
        
        // Query DB
        db.models.recent_report.scope('public').findAll(opts)
          .then((result) => {
            // Respond with list
            res.json(result);
          })
          .catch((err) => {
            // Send error message
            console.log(err);
            res.status(500).json({message: 'Unable to request recent reports listing.'});
          });
      });

    this.registerResource(`/:recentReport([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})`)
    
      // Request to delete specified recent report entry
      .delete((req,res) => {

        // 1. Find the recent report
        db.models.recent_report.findOne({where: {ident: req.params.recentReport}})

        // 2. Delete recent report entry if exists
          .then((result) => {
            if(result === null) {
              return res.status(404).json({message: 'Failed to find the requested recent report entry'});
            } else {
              return result.destroy();
            }
          })
          // 3. Send result to browser
          .then(() => {
            res.status(204).send();
          })
          .catch((err) => {
            if(err.message === 'recentReportNotFound') return res.status(404).json({message: 'Unable to find the requested recent report'});

            res.status(500).json({message: 'Unable to remove the recent report entry', cause: err.message});
          });
      
      });
    
  }
  
  /**
   * Recent Report Resource
   */
  resource() {
    
    this.registerResource(`/report/:report([A-Z0-9]{5})`)
      
      // Request to retrieve specified recent report entry
      .get((req,res) => {
        res.json(req.entry);
      })
      
      // Update or create
      .put((req,res) => {
        // Update entry
        
        let report_id = null;
        
        // 1. Find the report id
        db.models.analysis_report.findOne({where: {ident: req.params.report}})
        
          // 2. Does the recent report entry exist?
          .then((result) => {
          
            if(result === null) throw new Error('reportNotFound');
            
            // Get Report ID
            report_id = result.id;
            
            return db.models.recent_report.findOne({ where: { pog_report_id: result.id, user_id: req.user.id } })
          })
          
          // 3. Create or update depending on previous existance
          .then((result) => {
            if(result === null) {
              return db.models.recent_report.create({ user_id: req.user.id, pog_report_id: report_id, state: req.body.state });
            } else {
              result.state = req.body.state;
              return result.save();
            }
          })
          
          // 4. Get the public version with nested pog and user
          .then((result) => {
            return db.models.recent_report.scope('public').findOne({where: {id: result.id}});
          })
          
          // 5. Send result to client
          .then((result) => {
            res.json(result);
          })
          
          // ?? Profit? Just errors.
          .catch((err) => {
            if(err.message === 'reportNotFound') return res.status(404).json({message: 'Unable to find the requested report'});
            
            res.status(500).json({message: 'Unable to update the recent report entry', cause: err.message});
          });
      });
    
  }
  
  
};