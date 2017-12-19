"use strict";

// app/routes/genomic/detailedGenomicAnalysis.js
const express             = require('express');
const acl                 = require(process.cwd() + '/app/middleware/acl');
const _                   = require('lodash');
const db                  = require(process.cwd() + '/app/models');
const RoutingInterface    = require('../../../routes/routingInterface');
const AnalysisLib         = require('../../../libs/structures/analysis');
const Analysis            = require('../analysis.object');
const POGLib              = require('../../../libs/structures/pog');
const Generator           = require('../../tracking/generate');
const $bioapps            = require('../../../api/bioapps');
const $lims               = require('../../../api/lims');


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
  
    // Setup analysis endpoint
    this.analysis();
    
    // Extended Details
    this.extended();
    
    this.registerResource('/')
      .get((req, res, next) => {
  
        let analyses;
        let opts = {
          order: [['createdAt', 'DESC']],
          include: [
            {as: 'analysis', model: db.models.analysis_report, separate: true}
          ],
          where: {}
        };
        
        let pog_include = { as: 'pog', model: db.models.POG.scope('public'), where: {} };
        if(req.query.search) opts.where['$pog.POGID$'] = {$ilike: `%${req.query.search}%` };
        if(req.query.project) opts.where['$pog.project$'] = req.query.project;
        
        if(req.query.paginated) {
          opts.limit = req.query.limit || 25;
          opts.offset = req.query.offset || 0;
        }
        
        opts.include.push(pog_include);
        
        // Execute Query
        db.models.pog_analysis.findAndCountAll(opts)
          .then((result) => {
            
            if(req.query.paginated) {
              res.json({total: result.count, analysis: result.rows});
            }
            
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
            analysis.biopsy_date = req.body.biopsy_date;
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
  
  // Single Entry
  analysis() {
    
    this.registerResource(`/:analysis(${this.UUIDregex})`)
      .put((req, res, next) => {
        
        let analysis = new Analysis(req.analysis);
        
        analysis.update(req.body)
          .then((result) => {
            res.json(result);
          })
          .catch((err) => {
            console.log(err);
            res.status(500).json({message: 'Failed to update analysis settings: ' + err.message});
          });
      
      })
      .get((req, res, next) => {
        res.json(req.analysis);
      })
      .delete((req, res, next) => {
        res.status(420).send();
      });
    
  }
  
  // Extended Details
  extended() {
    
    this.registerEndpoint('get', `/extended/:analysisIdent(${this.UUIDregex})`, (req, res) => {
  
      let bioAppsPatient = null;
      let limsIllumina = {};
      let analysis = null;
  
      let opts = {
        limit: req.query.limit || 15,
        offset: req.query.offset || 0,
        order: [['createdAt', 'DESC']],
        include: [
          {as: 'analysis', model: db.models.analysis_report, separate: true}
        ],
        where: { ident: req.params.analysisIdent }
      };
  
      let pog_include = { as: 'pog', model: db.models.POG.scope('public'), where: {} };
  
      opts.include.push(pog_include);
      
      // Execute Query
      db.models.pog_analysis.findOne(opts)
        .then((result) => {
          analysis = result;
        })
        .then(() => { return $bioapps.patient(analysis.pog.POGID) })
        .then((result) => {
          if(result.length === 0) {
            res.status(404).json({message: 'Failed to find patient record in BioApps for unknown reasons.'});
            return;
          }
          bioAppsPatient = result[0];
        })
        .then(() => { return $lims.illuminaRun([analysis.libraries.tumour, analysis.libraries.transcriptome]); })
        .then((result) => {
          
          // Loop over lanes
          _.forEach(result.results, (row) => {
            
            let tumour = null;
            let rna = null;
            let pool = null;
            
            // Multiplex library
            if(row.multiplex_libraries.length > 0) {
              if(row.multiplex_libraries.indexOf(analysis.libraries.tumour) > -1) pool = tumour = true;
              if(row.multiplex_libraries.indexOf(analysis.libraries.transcriptome) > -1) pool = rna = true;
            }
            
            // Non-multiplex
            if(row.multiplex_libraries.length === 0) {
              if(row.library === analysis.libraries.tumour) tumour = true;
              if(row.library === analysis.libraries.transcriptome) rna = true;
            }
            
            if(tumour) {
              if(analysis.libraries.tumour in limsIllumina) limsIllumina[analysis.libraries.tumour].lanes++;
              if(!(analysis.libraries.tumour in limsIllumina)) limsIllumina[analysis.libraries.tumour] = {sequencer: row.sequencer, lanes: 1, pool: (pool) ? row.library : false };
              
            }
            
            if(rna) {
              if(analysis.libraries.transcriptome in limsIllumina) limsIllumina[analysis.libraries.transcriptome].lanes++;
              if(!(analysis.libraries.transcriptome in limsIllumina)) limsIllumina[analysis.libraries.transcriptome] = {sequencer: row.sequencer, lanes: 1, pool: (pool) ? row.library : false };
            }
            
          });
          
        })
        .then(() => {
          
          if(!bioAppsPatient.sources) {
            res.status(404).json({message: 'Failed to retrieve patient record for BioApps with sources listed.'});
            return;
          }
        
          // Get Source
          let source = _.findLast(bioAppsPatient.sources, {pathology: 'Diseased'});
          let analysis_settings = _.last(source.source_analysis_settings);
          
          if(!source) {
            res.status(404).json({message: 'Failed to find a BioApps record with disease source identified'});
            return;
          }
          
          // Map to variables
          let response = {
            patient: analysis.pog.POGID,
            sex: source.sex,
            age: source.stage,
            threeLetterCode: analysis.threeLetterCode,
            lib_normal: analysis.libraries.normal,
            lib_tumour: analysis.libraries.tumour,
            pool_tumour: limsIllumina[analysis.libraries.tumour].pool,
            lib_rna: analysis.libraries.transcriptome,
            pool_rna: limsIllumina[analysis.libraries.transcriptome].pool,
            disease: analysis.disease,
            biopsy_notes: analysis.biopsy_notes,
            biop: analysis_settings.sample_type + analysis_settings.biopsy_number,
            num_lanes_rna: limsIllumina[analysis.libraries.transcriptome].lanes,
            num_lanes_tumour: limsIllumina[analysis.libraries.tumour].lanes,
            sequencer_rna: limsIllumina[analysis.libraries.transcriptome].sequencer,
            sequencer_tumour: limsIllumina[analysis.libraries.tumour].sequencer,
            priority: analysis.priority,
            biofxician: null,
            analysis_due: analysis.date_analysis
          };
      
          res.json(response);
      
        })
        .catch((err) => {
          res.status(500).json({message: 'Failed to query extended details'});
          console.log('Error', err);
        });
      
    });
  }
  
  
  
};