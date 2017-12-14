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
                biopsy_notes: null
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
          if(req.body.state && allowProbeStates.indexOf(req.body.state) !== -1) createReportOpts.state = req.body.state;
        }
        
        return report.create(patientObj, analysisObj, req.user, req.params.type, reportOpts);
        
      })
      
      .then((report) => {
        
        reportObj = report;
      
        report.pog = patientObj;
        
        // Setup up loader configuration
        let loaderRun; // Object to contain loader run promise
        let loaderConf = {
          profile: req.body.project + '_' + req.params.type,
          baseDir: directory
        };
        
        // If loader set is specified by request
        if(req.body.loaders) loaderConf.load = req.body.loaders;
        
        // -- Possible Loader Scenarios to run -- //
        // -------------------------------------- //
        
        // POG Genomic Report
        if(loaderConf.profile.toLowerCase() === 'pog_genomic') {
          let GenomicLoader = new require(process.cwd() + '/app/loaders');
          let Loader = new GenomicLoader(patientObj, reportObj, loaderConf);
          return Loader.load();
        }
  
  
        // POG Probe Report
        if(loaderConf.profile.toLowerCase() === 'pog_probe') {
          let ProbeLoader = new require(process.cwd() + '/app/loaders/probing');
          let Loader = new ProbeLoader(patientObj, reportObj, loaderConf);
          return Loader.load();
        }
  
        // Non-POG Probe Report
        if(req.body.project.toLowerCase() !== 'pog' && req.params.type.toLowerCase() === 'probe') {
          loaderConf.load = (loaderConf.defaults[req.body.profile] === undefined) ? loaderConf.defaults['default_probe'].loaders :  loaderConf.defaults[req.body.profile].loaders;
          loaderConf.profile = 'nonPOG';
          let ProbeLoader = new require(process.cwd() + '/app/loaders/probing');
          let Loader = new ProbeLoader(patientObj, reportObj, loaderConf);
          return Loader.load();
        }
  
        // Non-POG Genomic Report
        if(req.body.project.toLowerCase() !== 'pog' && req.params.type.toLowerCase() === 'genomic') {
          // Non-POG options
          loaderConf.nonPOG = true;
          loaderConf.load = (loaderConf.defaults[req.body.profile] === undefined) ? loaderConf.defaults['default_genomic'].loaders :  loaderConf.defaults[req.body.profile].loaders;
          loaderConf.baseDir = req.body.baseDir;
          loaderConf.profile = 'nonPOG';
          loaderConf.libraries = (loaderConf.defaults[req.body.profile] === undefined) ? {} : loaderConf.defaults[req.body.profile].libraries;
          loaderConf.moduleOptions = (loaderConf.defaults[req.body.profile] === undefined) ? {} : loaderConf.defaults[req.body.profile].moduleOptions;
    
          let GenomicLoader = new require(process.cwd() + '/app/loaders');
    
          let Loader = new GenomicLoader(patientObj, reportObj, loaderConf);
          return Loader.load();
        }
        
        // No matching loader scenario found
        res.status(400).json({error: {message: 'Unable to invoke loading mechanism - no loader configuration matched request'}});
        
      })
      
      // Retrieve results from loaders, and ask for public report object
      .then((result) => {
        let report = new reportLib(reportObj);
        
        console.log('############ Loader Result', result);
        
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

/*

// Handle requests for loading POG into DB
router.route('/:type(genomic|probe)')
  .post((req,res,next) => {

    // Pog Options
    let pogOpts = { create: true };
    let profile;

    if(!req.body.project) return res.status(400).json({error: {message: "Project type is required in body.", code: "projectTypeNotSpecified"}});

    console.log("## LOAD REQUEST ## Report type: " + req.params.type + ', project ID: ' + req.params.POGID + ', Project: ' + req.body.project);

    // Determine Loading Profile
    if(req.body.project === "POG") {
      pogOpts.nonPOG = false;
      if(req.params.type === 'genomic') profile = "pog_genomic";
      if(req.params.type === 'probe') profile = "pog_probe";
    }

    // Check if it's a nonPOG
    if(req.body.project !== 'POG') {
      pogOpts.nonPOG = true;
      pogOpts.project = req.body.project;
      profile = req.body.project + '_' + req.params.type;
    }
    
    if(!req.body.project) {
      return res.status(400).json({message: 'Project name must be specified in the body'});
    }

    // First check if there's a POG entry..
    let POG = new pogLib(req.params.POGID);
  
    // Retrieve/Create POG/Patient Entry First
    POG.retrieve(pogOpts)
      .then((POG) => {
        // Create Report
        let report = new reportLib();
        let createReportOpts = {};

        // Check for state detail being set
        if(req.params.type === 'genomic') {
          createReportOpts.state = 'ready';

          if(req.body.state && allowGenomicStates.indexOf(req.body.state) !== -1) createReportOpts.state = req.body.state;
        }

        // If no state set, and probe, change default start to uploaded
        if(req.params.type === 'probe') {
          createReportOpts.state = 'uploaded';

          if(req.body.state && allowProbeStates.indexOf(req.body.state) !== -1) createReportOpts.state = req.body.state;
        }
  
        
        //Create a new report entry (Also creates new analysis run)
        
        report.create(POG, req.user, (req.params.type !== 'genomic' && req.params.type !== 'probe') ? 'genomic' : req.params.type, createReportOpts)
          .then((report) => {

            // Set POG to report
            report.pog = POG;

            // Set profile
            let loaderOptions = { profile: profile };
            
            // Check for supplied base directory
            if(req.body.baseDir) loaderOptions.baseDir = req.body.baseDir;

            // Check for specified loaders
            if(req.body.loaders) {
              loaderOptions.load = req.body.loaders;
            }
            
            // Create RunLoader promise object
            let runLoader;

            // POG Genomic Report
            if(loaderOptions.profile === 'pog_genomic') {
              let GenomicLoader = new require(process.cwd() + '/app/loaders');
              let Loader = new GenomicLoader(POG, report, loaderOptions);
              runLoader = Loader.load();
            }
            
            // POG Probe Report
            if(loaderOptions.profile === 'pog_probe') {
              let ProbeLoader = new require(process.cwd() + '/app/loaders/probing');
              let Loader = new ProbeLoader(POG, report, loaderOptions);
              runLoader = Loader.load();
            }

            // Non-POG Probe Report
            if(req.body.project !== 'POG' && req.params.type === 'probe') {
              loaderOptions.load = (loaderConf.defaults[req.body.profile] === undefined) ? loaderConf.defaults['default_probe'].loaders :  loaderConf.defaults[req.body.profile].loaders;
              loaderOptions.profile = 'nonPOG';
              let ProbeLoader = new require(process.cwd() + '/app/loaders/probing');
              let Loader = new ProbeLoader(POG, report, loaderOptions);
              runLoader = Loader.load();
            }

            // Non-POG Genomic Report
            if(req.body.project !== 'POG' && req.params.type === 'genomic') {
              // Non-POG options
              loaderOptions.nonPOG = true;
              loaderOptions.load = (loaderConf.defaults[req.body.profile] === undefined) ? loaderConf.defaults['default_genomic'].loaders :  loaderConf.defaults[req.body.profile].loaders;
              loaderOptions.baseDir = req.body.baseDir;
              loaderOptions.profile = 'nonPOG';
              loaderOptions.libraries = (loaderConf.defaults[req.body.profile] === undefined) ? {} : loaderConf.defaults[req.body.profile].libraries;
              loaderOptions.moduleOptions = (loaderConf.defaults[req.body.profile] === undefined) ? {} : loaderConf.defaults[req.body.profile].moduleOptions;

              let GenomicLoader = new require(process.cwd() + '/app/loaders');

              let Loader = new GenomicLoader(POG, report, loaderOptions);
              runLoader = Loader.load();
            }

            // No Loader Profile could be found
            if(runLoader === null) {
              res.status(500).json({error: {message: 'Unable to invoke loading mechanism'}});
              throw new Error('No Loaders Running');
            }

            // Loader promise resolution
            runLoader.then(
              (result) => {

                db.models.analysis_report.scope('public').findOne({
                  where: { id: report.id },
                  include: [
                    {model: db.models.patientInformation, as: 'patientInformation', attributes: { exclude: ['id', 'deletedAt', 'pog_id'] } },
                    {model: db.models.tumourAnalysis.scope('public'), as: 'tumourAnalysis' },
                    {model: db.models.user.scope('public'), as: 'createdBy'},
                    {model: db.models.POG.scope('public'), as: 'pog' },
                    {model: db.models.pog_analysis.scope('public'), as: 'analysis'}
                  ]
                }).then(
                  (reports) => {
                    res.json(reports);
                  })
                  .catch((err) => {
                    console.log('Unable to lookup analysis reports', err);
                    res.status(500).json({error: {message: 'Unable to lookup analysis reports.'}});
                  });


              },
              (err) => {
                console.log('Loader Error', err);
                res.status(400).json({error: {message: 'Unable to load new POG report', code: 'loadersFailed', error: err}});
              }
            );

          })
          .catch((err) => {
            console.log('Failed to remove POG after loader failed', err);
            return res.status(error.status || 500).json({error: {message: 'Unable to load new POG data entries', code: 'reportCreateQueryFailed'}});
          });

      })
      .catch((err) => {
        console.log('Failed to remove POG after loader failed', err);
        return res.status(err.status || 500).json({error: {message: 'Unable to load new POG data entries', code: 'pogObjectQueryFailed'}});
      });

  })
  .delete((req,res,next) => {
    // Are we able to find this POG Report Entry?
    db.models.POG.findOne({ where: { POGID: req.params.POG} }).then(
      (pog) => {

        if(pog !== null) {
          // One was found, remove it!
          db.models.POG.destroy({ where: { POGID: req.params.POG} }).then(
            (result) => {
              // Successfully removed
              res.json({success: true});
            },
            (err) => {
              // Error
              res.status(500).json({error: {message: 'An internal error occured', code: 'pogFailedDestroy'}});
            }
          );
        }

        if(pog === null) {
          res.status(404).json({error: {message: 'Unable to find the requested resource', code: 'pogLookupFailed'}});
        }
      },
      (err) => {
        // Error
        res.status(500).json({error: {message: 'An internal error occured', code: 'pogFailedLookup'}});
      }
    );


  });
  */

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