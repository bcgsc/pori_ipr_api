"use strict";

// Required Libraries
const express             = require('express');
const router              = express.Router({mergeParams: true});
const db                  = require(process.cwd() + '/app/models');
const pogLib              = require(process.cwd() + '/app/libs/structures/pog');
const reportLib           = require(process.cwd() + '/app/libs/structures/analysis_report');
const nconf               = require('nconf').file(process.cwd() + '/config/'+process.env.NODE_ENV+'.json');
const fs                  = require('fs');
const pyconf              = require('pyconf');
const _                   = require('lodash');
const d3                  = require('d3-dsv');
const moment              = require('moment');
const logger              = process.logger;

const Patient             = require(`${process.cwd()}/app/libs/patient/patient.library`);
const Analysis            = require(`${process.cwd()}/app/libs/patient/analysis.library`);

// Loader config
let loaderConf = nconf.get('loader');

// Static loader settings
const allowProbeStates = ['uploaded', 'nonproduction'];
const allowGenomicStates = ['ready', 'archived', 'nonproduction'];

/**
 * Load Genomic Report Endpoint
 *
 */
router.route('/:type(genomic|probe)')
  .post((req,res) => {
    
    // Check for required fields
    if(!req.body.project) return res.status(400).json({message: 'Project name is required in POST body.'});
    if(!req.body.directory && !req.body.baseDir) return res.status(400).json({message: 'Report root folder is required in POST body.'});
  
    // Setup Patient Detection
    let patient = req.params.POGID;
    let patientObj;
    let reportType = req.params.type;
    let analysisObj;
    
    let project = req.body.project;
    let directory = req.body.directory || req.body.baseDir;
    let loaderConfig = req.body.loader_config || project + '_' + reportType; // Build standard form loader config
    
    let reportConfig;
    let reportConfigLibraries = [];
    
    let reportObj;
    
    logger.info(`Load report request: ${reportType} report for ${project}, patient ${patient} from ${directory} using ${loaderConfig} loader config`);
    
    // Read in Config File
    getConfig(directory)
      .then((conf) => {
        
        // Save Config
        reportConfig = conf;
      
        return new Promise((resolve, reject) => {
          // Get Libraries from config
          let libraries = [];
          
          let firstLibraryKey = conf.__keys.libraries;
          
          // Check if following two rows are liraries
          let secondLibraryKey = firstLibraryKey + 1;
          let thirdLibraryKey = firstLibraryKey + 2;
          
          if(conf.__lines[firstLibraryKey].match(/[A-Z]{1}[0-9]{5,}/g)) libraries.push(conf.__lines[firstLibraryKey].match(/[A-Z]{1}[0-9]{5,}/g)[0]);
          if(conf.__lines[secondLibraryKey].match(/[A-Z]{1}[0-9]{5,}/g)) libraries.push(conf.__lines[secondLibraryKey].match(/[A-Z]{1}[0-9]{5,}/g)[0]);
          if(conf.__lines[thirdLibraryKey].match(/[A-Z]{1}[0-9]{5,}/g)) libraries.push(conf.__lines[thirdLibraryKey].match(/[A-Z]{1}[0-9]{5,}/g)[0]);
          
          // Store libraries in parent namespace
          reportConfigLibraries = libraries;
          
          // Read Libraries
          resolve(libraries);
        });
      })
      
      // Query Libraries
      .then((libraries) => {
        let opts = {
          where: {
            $or: {
              "libraries.normal": {
                $in: libraries
              },
              "libraries.tumour": {
                $in: libraries
              },
              "libraries.transcriptome": {
                $in: libraries
              }
            }
          },
          include: [
            {model: db.models.POG, as: 'pog'}
          ]
        };
        return db.models.pog_analysis.findOne(opts);
      })
      
      .then((result) => {
        return new Promise((resolve, reject) => {
  
          // If a result is found, set to analysis and pog
          if(result) {
            analysisObj = result;
            patientObj = analysisObj.pog;
            
            return resolve({patient: patientObj, analysis: analysisObj});
          }
          
          // Load flatfile and check libraries for type
          getFlatFile(reportConfig.flatfile)
            .then((flatfile) => {
              let analysis = {
                libraries: {},
                analysis_biopsy: null,
                comparator_disease: {},
                comparator_normal: {},
                disease: null,
                biopsy_notes: null,
              };
            
              // Parse libraries
              _.forEach(reportConfigLibraries, (l) => {
                let row = _.find(flatfile, {library_name: l});
                
                if(!row) return;
                
                // If Normal
                if(row.diseased_status === 'Normal') analysis.libraries.normal = l;
                
                // if transcriptome
                if(row.diseased_status === 'Diseased' && row.protocol.indexOf('RNA') > -1) analysis.libraries.transcriptome = l;
                
                // if Tumour
                if(row.diseased_status === 'Diseased' && row.protocol.indexOf('RNA') === -1) {
                  analysis.libraries.tumour = l;
                  analysis.analysis_biopsy = row.sample_prefix;
                  analysis.biopsy_site = row.biopsy_site;
                  analysis.disease = row.diagnosis;
                  analysis.biopsy_date = moment(row.sample_collection_time).toISOString();
                  analysis.comparator_disease = {
                    tcga: _.filter(row.tcga_comp.split(';'), (r) => { return (r); }),
                    gtex_bioposy_site: row.gtex_comp.split(';')[1],
                    gtex_primary_site: row.gtex_comp.split(';')[0]
                  };
                  analysis.comparator_normal = {
                    normal_comparator_biopsy_site: row.normal_comp.split(';')[1],
                    normal_comparator_primary_site: row.normal_comp.split(';')[0]
                  };
                }
              }); // End looping libraries
              
              return Patient.retrieveOrCreate(patient, project)
                .then((patient) => {
                  patientObj = patient;
                  // Create Analysis
                  return Analysis.create(patient.id, analysis);
                })
                .then((analysis) => {
                  analysisObj = analysis;
                  resolve({patient: patientObj, analysis: analysisObj});
                })
                .catch((e) => {
                  reject({message: 'Failed to create patient from report config and flatfile: '+ e.message});
                  console.log('Failed to create patient and analysis from config and flatile', e);
                });
  
            })
            .catch((err) => {
              res.json({message: `Failed to load the flatfile: ${reportConfig.flatfile}`});
              console.log('Failed to load flatfile', err);
            });
          
          
        });
      })
      
      // Create Report
      .then((result) => {
      
        // Prepare Loaders
        let report = new reportLib();
        
        let reportOpts = {};
        
        // Default starting state for a report based on type
        if(req.params.type === 'genomic') {
          reportOpts.state = 'ready';
          if(req.body.state && allowGenomicStates.indexOf(req.body.state) !== -1) reportOpts.state = req.body.state;
        }
        
        if(req.params.type === 'probe') {
          reportOpts.state = 'uploaded';
          if(req.body.state && allowProbeStates.indexOf(req.body.state) !== -1) reportOpts.state = req.body.state;
        }
        
        // Get Report Matrix Value
        if(reportConfig.ExpressionMatrixVersion) reportOpts.expression_matrix = reportConfig.ExpressionMatrixVersion.toLowerCase() || 'v8';
        
        return report.create(patientObj, analysisObj, req.user, req.params.type, reportOpts);
        
      })
      
      .then((report) => {
        
        reportObj = report;
      
        report.pog = patientObj;
        
        // Setup up loader configuration
        let loaderRun; // Object to contain loader run promise
        let loaderOptions = {
          profile: req.body.project + '_' + req.params.type,
          baseDir: directory
        };
        
        // If loader set is specified by request
        if(req.body.loaders) loaderOptions.load = req.body.loaders;
        
        // -- Possible Loader Scenarios to run -- //
        // -------------------------------------- //
        
        // POG Genomic Report
        if(loaderOptions.profile.toLowerCase() === 'pog_genomic') {
          let GenomicLoader = new require(process.cwd() + '/app/loaders');
          let Loader = new GenomicLoader(patientObj, reportObj, loaderOptions);
          return Loader.load();
        }
  
  
        // POG Probe Report
        if(loaderOptions.profile.toLowerCase() === 'pog_probe') {
          let ProbeLoader = new require(process.cwd() + '/app/loaders/probing');
          let Loader = new ProbeLoader(patientObj, reportObj, loaderOptions);
          return Loader.load();
        }
  
        // Non-POG Probe Report
        if(req.body.project.toLowerCase() !== 'pog' && req.params.type.toLowerCase() === 'probe') {
          loaderOptions.load = (loaderConf.defaults[req.body.profile] === undefined) ? loaderConf.defaults['default_probe'].loaders :  loaderConf.defaults[req.body.profile].loaders;
          loaderOptions.profile = 'nonPOG';
          let ProbeLoader = new require(process.cwd() + '/app/loaders/probing');
          let Loader = new ProbeLoader(patientObj, reportObj, loaderOptions);
          return Loader.load();
        }
  
        // Non-POG Genomic Report
        if(req.body.project.toLowerCase() !== 'pog' && req.params.type.toLowerCase() === 'genomic') {
          // Non-POG options
          loaderOptions.nonPOG = true;
          loaderOptions.load = (loaderConf.defaults[req.body.profile] === undefined) ? loaderConf.defaults['default_genomic'].loaders :  loaderConf.defaults[req.body.profile].loaders;
          loaderOptions.baseDir = req.body.baseDir;
          loaderOptions.profile = 'nonPOG';
          loaderOptions.libraries = (loaderConf.defaults[req.body.profile] === undefined) ? {} : loaderConf.defaults[req.body.profile].libraries;
          loaderOptions.moduleOptions = (loaderConf.defaults[req.body.profile] === undefined) ? {} : loaderConf.defaults[req.body.profile].moduleOptions;
    
          let GenomicLoader = new require(process.cwd() + '/app/loaders');
    
          let Loader = new GenomicLoader(patientObj, reportObj, loaderOptions);
          return Loader.load();
        }
        
        // No matching loader scenario found
        res.status(400).json({error: {message: 'Unable to invoke loading mechanism - no loader configuration matched request'}});
        
      })
      
      // Retrieve results from loaders, and ask for public report object
      .then((result) => {
        let report = new reportLib(reportObj);
        
        return report.public();
      })
      
      // Send public copy of report object
      .then((report) => {
        res.json(report);
      })
      
      // Handle load failures
      .catch((e) => {
        res.status(400).json({message: 'Failed to load report: ' + (e.message || e.reason), reason: e.reason, file: e.file});
        logger.error(e.message, e);
      });
    
  
  });

module.exports = router;

/**
 * Get Report Config File
 *
 * @param {string} directory - Path to directory containing report configuration file
 *
 * @returns {Promise/object} - Resolves with parsed patient config file
 */
let getConfig = (directory) => {
  
  return new Promise((resolve, reject) => {
    
    // From the base directory read in the Report_Tracking.cfg file
    fs.readFile(directory + '/Report_tracking.cfg', 'utf8', (err, data) => {
      if(err) {
        console.log(err);
        // Unable to find config file
        reject('Unable to find Report_tracking.cfg file');
        return;
      }
      
      // Parse config file with pyconf
      pyconf.parse(data, (err, config) => {
        
        if(err) {
          reject('Unable to parse python report tracking config file');
        }
        
        this.config = config;
        
        resolve(this.config);
        
      });
    });
  });
};

/**
 * Retrieve patient flatile
 *
 * @param {string} path - Directory to flatfile
 *
 * @returns {Promise/object} - Resolves with parsed TSV file
 */
let getFlatFile = (path) => {
  return new Promise((resolve, reject) => {
    // Read in TSV file
    fs.readFile(path, (err, data) => {
      
      if(err) reject({message: `Failed to retrieve flatfile: ${err.message}`});
      
      // Parse TSV file
      let parsedFlatFile = d3.tsvParse(data.toString());
      
      // Send data to
      resolve(parsedFlatFile);
    });
  });
};