"use strict";

/*
 * IPR-API - Integrated Pipeline Reports API
 * Copyright 2017 Michael Smith Genome Sciences Center
 * Author: Brandon Pierce <bpierce@bcgsc.ca>
 * JIRA Ticketspace: DEVSU
 *
 * This Node.JS script is designed to be run in ES6ES6 compliant mode
 *
 */

const db          = require(process.cwd() + '/app/models/'); // Load database
const $bioapps    = require(process.cwd() + '/app/api/bioapps');
const _           = require('lodash');
const moment      = require('moment');
const Task        = require('../task');

//let logger        = require('winston'); // Load logging library
let logger        = process.logger;

logger.info('Starting BioApps Sync');

class BioAppsSync {
  
  constructor (options={}) {
    this.dryrun = options.dryrun || false;
    this.pogids = [];             // POGIDs that need to be check for Path passed
    this.pog_analyses = {};       // Analyses being tracked
    this.pogs = {};               // Processed POGs from LIMS
    this.diseaseLibraries = [];   // Libraries that need resolution from LIMS Library API
    this.user = null;             // Sync User
    this.cache = { tasks: [] };
  }
  
  /**
   * Initialize syncronization task
   *
   * @returns {Promise} - Resolves with status of
   */
  init() {
    return new Promise((resolve, reject) => {
    
    // 0. Patient Data Sync!
    $bioapps.login()                                        // 00. Fresh session with BioApps API
      .then(this._getSyncUser.bind(this))                   // 01. Get the Sync user account
      .then(this.getBioAppsSyncRequired.bind(this))         // 02. Get Tasks Requiring BioApps Sync
      .then(this.queryBioAppsPatient.bind(this))            // 03. Query BioApps Patient Details (Biop)
      .then(this.parseBioAppsPatient.bind(this))            // 04. Parse BioApps Patient Details (Biop#)
      .then(this.getMergedBamsRequired.bind(this))          // 05. Get Tasks Pending Merged BAMs required
      .then(this.queryMergedBams.bind(this))                // 06. Query BioApps to get Merged BAMs available // GET http://bioappsdev01.bcgsc.ca:8104/merge?library=P01234,P01235,P01236
      .then(this.parseMergedBams.bind(this))                // 07. Parse response from BioApps and update tracking
      .then(this.getAssemblyCompleteRequired.bind(this))    // 08. Get tasks with assembly required pending
      .then(this.queryAssemblyComplete.bind(this))          // 09. Query BioApps to see which have completed assembly // GET http://bioappsdev01.bcgsc.ca:8104/assembly?library=P02511
      .then(this.parseAssemblyComplete.bind(this))          // 10. Parse response from BioApps and update tracking
      //.then(this.getSymlinksRequired.bind(this))          // 11. Get tasks with Symlink required pending  //
      //.then(this.querySymlinksCreated.bind(this))         // 12. Query BioApps to see which tasks have completed symlink creation
      //.then(this.parseSymlinksCreated.bind(this))         // 13. Parse response from BioApps and update tracking
      .then((result) => {                                   // 14. Profit.
        
        logger.info('Finished processing BioApps syncing.');
        resolve({summary: 'Finished running BioApps check.', result: result});
        this._reset(); // Reset
        
      })
      .catch((err) => {
        logger.error('Failed to complete BioApps sync: ' + err.message);
        console.log(err);
        this._reset(); // Reset
        reject({message: 'Failed BioApps Sync: ' + err.message});
        
      });
      
    });
  }
  
  
  
  /**
   * Get all tasks that need to sync patient data
   *
   * @returns {Promise}
   */
  getBioAppsSyncRequired() {
    return new Promise((resolve, reject) => {
      
      // Query Params
      let opt = {
        where: {
          slug: 'bioapps_patient_sync',
          deletedAt: null,
          status: ['pending', 'failed'],
        },
        attributes: {
          include: ['state_id']
        },
        include: [
          {as: 'state', model: db.models.tracking_state.scope('noTasks'), }
        ]
      };
      
      logger.info('Querying DB for all tracking tasks requiring patient syncing');
      
      db.models.tracking_state_task.scope('public').findAll(opt)
        .then((tasks) => {
          logger.info('Tasks requiring bioapps data sync', tasks.length);
          this.cache.tasks.patients = tasks;
          resolve(tasks);
        })
        .catch((err) => {
          logger.error('Unable to retrieve tasks requiring patient syncing', err);
          reject({message: 'Unable to retrieve tasks requiring patient syncing', cause: err.message});
        });
      
    });
  }
  
  
  /**
   * Process patient data from BioApps and save in IPR
   *
   * @param {array} patients - Collection of results from BioApps
   * @returns {Promise}
   */
  parseBioAppsPatient (patients) {
    return new Promise((resolve, reject) => {
      
      // Create POGID Map
      let pogs = {};
      let queries = [];
      
      // Create POGID => Task map
      _.forEach(this.cache.tasks.patients, (p) => { pogs[p.state.analysis.pog.POGID] = p });
      
      // Loop over patient results and prep payloads
      _.forEach(patients, (p) => {
        if(p.length === 0) return;
        
        p = p[0]; // Remove array wrapper
        
        let libraries = [];
        let task = null;
        let source = null;
        let update = { data: {comparator_disease: {}, comparator_normal: {}}, where: {} };
        
        // Try to extract the POGID from this patient result and use it to pull the corresponding task entry
        try {
           task = pogs[p.sources[0].participant_study_identifier];
        }
        catch(e) {
          console.log('Unable to extract patient data for: ' + p);
          return; // Skip this row
        }
        
        // Set Libraries
        libraries = _.keys(task.state.analysis.libraries);
        
        // Pick the sources we're looking for.
        _.forEach(p.sources, (s) => {
          let search = _.find(s.libraries, {name: task.state.analysis.libraries.tumour});
          
          if(search) source = s;
        });
  
        // Check if source was found. If not, move to next entry.
        if(!source) {
          logger.error('Unable to find source for ' + p.sources[0].participant_study_identifier);
          return;
        }
        
        if(source.source_analysis_settings.length === 0) return;
        
        // With a source Found, time to build the update for this case;
        update.data.analysis_biopsy     = 'biop'.concat(_.last(source.source_analysis_settings).biopsy_number);
        update.data.bioapps_source_id   = source.id;
        update.data.biopsy_site         = source.anatomic_site;
  
        // Three Letter Code
        update.data.threeLetterCode     = _.last(source.source_analysis_settings).cancer_group.code;
        
        // Compile Disease Comparator
        update.data.comparator_disease = {};
        
        let settings = _.last(source.source_analysis_settings);
  
        update.data.comparator_disease.tcga = _.map(_.sortBy(settings.disease_comparators, 'ordinal'), (c) => {
          return c.disease_code.code;
        });
        update.data.comparator_disease.gtex_primary_site = settings.gtex_comparator_primary_site.name;
        update.data.comparator_disease.gtex_bioposy_site = settings.gtex_comparator_biopsy_site.name;
        
        // Compile Disease Comparator
        update.data.comparator_normal.illumina_bodymap_primary_site = settings.normal_comparator_primary_site.name;
        update.data.comparator_normal.illumina_bodymap_biopsy_site = settings.normal_comparator_biopsy_site.name;
        
        // Set update where clause.
        update.where = { ident: task.state.analysis.ident };
        
        update.task = task;
  
        queries.push(update);
      
      });
      
      // Update Tables first
      Promise.all(_.map(queries, (q) => {return db.models.pog_analysis.update(q.data, { where: q.where }) }))
        .then(() => {
          return Promise.all(_.map(queries, (q) => {
            let task = new Task(q.task);
            return task.checkIn(this.user, true);
          }))
        })
        .then((results) => {
          resolve(); // All done.
        })
        .catch((err) => {
          logger.error('Failed to update analysis table following BioApps patient sync');
          process.exit();
        });
      
    });
  }
  
  
  /**
   * Query BioApps Patient Data
   *
   * @param {array} tasks - Collection of tasks that need patient info syncing
   * @returns {Promise}
   */
  queryBioAppsPatient (tasks) {
    return new Promise((resolve, reject) => {
      
      Promise.all(_.map(tasks, (t) => { return $bioapps.patient(t.state.analysis.pog.POGID) }))
        .then(responses => {
          resolve(responses);
        })
        .catch((err) => {
          reject({message: 'Failed to query BioApps for patient data: ' + err.message});
          console.log('Failed to query BioApps patient data', err);
        });
      
    });
  }
  
  
  
  /**
   * Get all tasks that have not completed Merged BAMs
   *
   * @returns {Promise}
   */
  getMergedBamsRequired() {
    return new Promise((resolve, reject) => {
  
      // Query Params
      let opt = {
        where: {
          slug: 'bioapps_merged_bams',
          deletedAt: null,
          status: ['pending', 'failed'],
        },
        attributes: {
          include: ['state_id']
        },
        include: [
          {as: 'state', model: db.models.tracking_state.scope('noTasks'), }
        ]
      };
  
      logger.info('Querying DB for all tracking tasks without Merged BAMs data');
  
      db.models.tracking_state_task.scope('public').findAll(opt)
        .then((tasks) => {
          logger.info('Tasks requiring merged bam lookup', tasks.length);
          this.cache.tasks.mergedBams = tasks;
          resolve(tasks);
        })
        .catch((err) => {
          logger.error('Unable to retrieve pending merged bams tasks', err);
          reject({message: 'Unable to retrieve merged bam tasks', cause: err.message});
        });
      
    });
  }
  
  /**
   * Query BioApps Merged BAM endpoint
   *
   * @param {array} tasks - Collection of tasks that need merged BAM lookups performed
   * @returns {Promise}
   */
  queryMergedBams (tasks) {
    return new Promise((resolve, reject) => {
      
      Promise.all(_.map(tasks, (t) => { return $bioapps.merge(_.values(t.state.analysis.libraries).join(',')) }))
        .then(responses => {
          resolve(responses);
        })
        .catch((err) => {
          reject({message: 'Failed to query BioApps for merged data: ' + err.message});
          console.log('Failed to query BioApps', err);
        });
      
    });
  }
  
  /**
   * Process results from BioApps
   *
   * @param {array} results - Collection of results from BioApps
   * @returns {Promise}
   */
  parseMergedBams (results) {
    return new Promise((resolve, reject) => {
      
      let passedLibraries = {};
      
      // Loop over results from BioApps
      _.forEach(results, (biopsy) => {
      
        // Extract all the library entries for each task
        _.forEach(biopsy, (library) => {
          if(library.success && library.status === 'production') {
            
            if(library.libraries === undefined) {
              logger.warn('#### Library key not detected for merge result: ', library.id);
              return;
            }
            
            passedLibraries[library.libraries[0].name] = library;
          }
        })
      });
      
      let completedTasks = [];
      
      // Loop over tasks, and check if it's completed
      _.forEach(this.cache.tasks.mergedBams, (task) => {
        // Check all three libraries
        if(_.intersection(_.values(task.state.analysis.libraries), _.keys(passedLibraries)).length >= 3) {
          completedTasks.push(task);
        }
      });
      
      // For each completed task, check-in!
      Promise.all(_.map(completedTasks, (t) => { let task = new Task(t); return task.checkIn(this.user, true); }))
        .then((results) => {
          logger.info('Checked in merged bams for ' + results.length + ' tasks.');
          resolve(true);
        })
        .catch((err) => {
          logger.error('Failed to check in completed merged bams: ' + err.message);
        });
      
    });
  }
  
  /**
   * Get all tasks that have not completed assembly
   *
   * @returns {Promise}
   */
  getAssemblyCompleteRequired() {
    return new Promise((resolve, reject) => {
      
      // Query Params
      let opt = {
        where: {
          slug: 'bioapps_assembly',
          deletedAt: null,
          status: ['pending', 'failed'],
        },
        attributes: {
          include: ['state_id']
        },
        include: [
          {as: 'state', model: db.models.tracking_state.scope('noTasks'), }
        ]
      };
      
      logger.info('Querying DB for all tracking tasks without completed assembly data');
      
      db.models.tracking_state_task.scope('public').findAll(opt)
        .then((tasks) => {
          logger.info('Tasks requiring assembly lookup', tasks.length);
          this.cache.tasks.assembly = tasks;
          resolve(tasks);
        })
        .catch((err) => {
          logger.error('Unable to retrieve pending assembly tasks', err);
          reject({message: 'Unable to retrieve assembly tasks', cause: err.message});
        });
      
    });
  }
  
  /**
   * Query BioApps Aseembly
   *
   * @param {array} tasks - Collection of tasks that need assembly lookups performed
   * @returns {Promise}
   */
  queryAssemblyComplete (tasks) {
    return new Promise((resolve, reject) => {
      
      Promise.all(_.map(tasks, (t) => { return $bioapps.assembly(_.values(t.state.analysis.libraries).join(',')) }))
        .then(responses => {
          logger.info('Retrieved assembly results');
          resolve(responses);
        })
        .catch((err) => {
          reject({message: 'Failed to query BioApps for assembly completed: ' + err.message});
          console.log('Failed to query BioApps', err);
        });
      
    });
  }
  
  /**
   * Process assembly results from BioApps
   *
   * @param {array} results - Collection of results from BioApps
   * @returns {Promise}
   */
  parseAssemblyComplete (results) {
    return new Promise((resolve, reject) => {
      
      let passedLibraries = {};
      
      // Loop over results from BioApps
      _.forEach(results, (biopsy) => {
        
        // Extract all the library entries for each task
        _.forEach(biopsy, (library) => {
          if(library.success) {
            passedLibraries[library.libraries[0].name] = library;
          }
        })
      });
      
      let completedTasks = [];
      
      // Loop over tasks, and check if it's completed
      _.forEach(this.cache.tasks.assembly, (task) => {
        // Check all three libraries
        if(_.intersection(_.values(task.state.analysis.libraries), _.keys(passedLibraries)).length >= 2) {
          completedTasks.push(task);
        }
      });
      
      // For each completed task, check-in!
      Promise.all(_.map(completedTasks, (t) => { let task = new Task(t); return task.checkIn(this.user, true); }))
        .then((results) => {
          logger.info('Checked in assembly for ' + results.length + ' tasks.');
          resolve(true);
        })
        .catch((err) => {
          logger.error('Failed to check in completed assembly: ' + err.message);
        });
      
    });
  }
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  /**
   * Lookup tasks pending pathology results
   *
   * @returns {Promise}
   */
  getTasksPendingPath () {
    return new Promise((resolve, reject) => {
      
      // Query Params
      let opt = {
        where: {
          slug: 'pathology_passed',
          deletedAt: null,
          status: 'pending',
        },
        attributes: {
          include: ['state_id']
        },
        include: [
          {as: 'state', model: db.models.tracking_state.scope('noTasks'), }
        ]
      };
      
      logger.info('Querying DB for all tracking tasks without pathology');
      
      db.models.tracking_state_task.scope('public').findAll(opt).then(
        (result) => {
          
          let pogs = [];
          
          // Loop over results
          _.forEach(result, (r) => {
            
            let POGID = r.state.analysis.pog.POGID;
            
            pogs.push(POGID);
            
            if(!this.pog_analyses[POGID]) this.pog_analyses[POGID] = [];
            this.pog_analyses[POGID].push({
              ident: r.state.analysis.ident,
              clinical_biopsy: r.state.analysis.clinical_biopsy,
              analysis_biopsy: r.state.analysis.analysis_biopsy,
              disease: r.state.analysis.disease,
              biopsy_notes: r.state.analysis.biopsy_notes,
              libraries: r.state.analysis.libraries,
              createdAt: r.state.analysis.createdAt,
              task: r,
              pathDetected: false,
            });
            
          });
          
          logger.debug('Found ' + result.length + ' tasks requiring lookup');
          this.pogids = pogs;
          
          resolve();
        })
        .catch((err) => {
          console.log('Unable to retrieve pending pathology tasks', err);
          reject({message: 'Unable to retrieve pathology tasks', cause: err.message});
        });
    });
  }
  
  /**
   * Query LIMS Sample endpoint for POGs that have results
   *
   * @returns {Promise}
   */
  queryLimsSample() {
    return new Promise((resolve, reject) => {
      
      logger.info('Querying LIMS for sample details for supplied POGs');
      
      $lims.sample(this.pogids).then(
        (pogs) => {
          logger.info('Found ' + pogs.results.length + ' Results from LIMS sample endpoint.');
          resolve(pogs.results);
        })
        .catch((err) => {
          logger.error('Unable to retrieve LIMS Sample results for the provided pogs');
          reject({message: 'Unable to retrieve LIMS Sample results for the provided pogs: ' + err.message, cause: err});
        });
    });
  }
  
  /**
   * Parse LIMS Sample endpoint results
   *
   * @param {array} pogs - LIMS Sample endpoint result collection
   * @returns {Promise}
   * @private
   */
  _parseLimsSampleResults(pogs) {
    return new Promise((resolve, reject) => {
      
      logger.info('Starting to process sample results.');
      
      _.forEach(pogs, (sample) => {
        
        let pogid = sample.participant_study_id;
        let datestamp = sample.sample_collection_time.substring(0,10);
        
        let library = {
          name: sample.library,
          type: (sample.disease_status === 'Normal') ? 'normal' : null,
          source: sample.original_source_name,
          disease: sample.disease,
          sample_collection_time: sample.sample_collection_time
        };
        
        if(sample.disease_status === 'Diseased' && this.diseaseLibraries.indexOf(sample.library) === -1) {
          this.diseaseLibraries.push(sample.library);
        }
        
        // Check if pog has been seen yet in this cycle
        if(!this.pogs[pogid]) this.pogs[pogid] = {};
        
        // Check if this biopsy event date
        if(!this.pogs[pogid][datestamp]) this.pogs[pogid][datestamp] = [];
        
        // Has this library name been listed yet?
        if(!_.find(this.pogs[pogid][datestamp], {name: library.name})) {
          this.pogs[pogid][datestamp].push(library);
          logger.debug('Setting ' + library.name + ' for ' + pogid + ' biopsy ' + datestamp + ((library.type !== null) ? ' | library type detected: ' + library.type : ''));
        }
        
      });
      
      logger.info('Resulting in ' + this.diseaseLibraries.length + ' POGs that have pathology information and need biopsy library details.');
      
      resolve();
      
    });
  }
  
  /**
   * Query the LIMS Library API
   *
   * Resolve library details to determine RNA from DNA libs
   *
   * @returns {Promise}
   */
  queryLimsLibrary() {
    return new Promise((resolve, reject) => {
      $lims.library(this.diseaseLibraries).then(
        (libraries) => {
          
          logger.info('Received ' + libraries.results.length + ' libraries from LIMS library endpoint.');
          
          resolve(libraries.results);
        })
        .catch((err) => {
          logger.error('Unable to query LIMS library API endpoint: ' + err.message);
          reject({error: 'Unable to query LIMS library API endpoint: ' + err.message, cause: err});
        });
    });
  }
  
  /**
   * Parse Library results into master collection
   *
   * @param {array} libraries - Array of libraries found by LIMS library API
   * @returns {Promise}
   * @private
   */
  _parseLimsLibraryResults(libraries) {
    return new Promise((resolve, reject) => {
      
      // Loop over found libraries
      _.forEach(libraries, (library) => {
        
        // Grab associated POG biopsies
        let pog = this.pogs[library.full_name.split('-')[0]];
        
        // Loop over biopsies
        _.forEach(pog, (libraries, biopsy_date) => {
          
          // The index key of the library we're looking for
          let i = _.findKey(libraries, {name: library.name});
          
          logger.debug('Found mapped POG biopsy entry for ' + library.name + ' in position ' + i + ' in biopsy ' + biopsy_date + ' for ' + library.full_name.split('-')[0]);
          
          // If the index is valid, store the updated data
          if(i) {
            // Types of library strategy mappings
            if(library.library_strategy === 'WGS') this.pogs[library.full_name.split('-')[0]][biopsy_date][i].type = 'tumour';
            if(library.library_strategy.indexOf('RNA') > -1) this.pogs[library.full_name.split('-')[0]][biopsy_date][i].type = 'transcriptome';
          }
          
        });
        
      });
      
      //console.log(JSON.stringify(pogs));
      
      logger.info('Finished receiving library details.');
      
      resolve();
      
    });
  }
  
  /**
   * Detect biopsy events
   *
   */
  sortLibraryToBiopsy() {
    
    return new Promise((resolve, reject) => {
      
      // Loop over LIMS entries results
      _.forEach(this.pogs, (lims_biops, pogid) => {
        
        // Are there any Tracking Entries waiting?
        let tracking = this.pog_analyses[pogid];
        
        // Are there any biopsies waiting?
        if(Object.keys(tracking).length > 0) {
          
          // Loop over tracking analysis to see if there's a matching biopsy window by then looping over LIMS entries
          _.forEach(tracking, (tracking_analysis, track_i) => {
            
            // Loop over the found LIMS biopsy sorted libraries
            _.forEach(lims_biops, (lims_libs, lims_biopsy_date) => {
              
              let normal = _.find(lims_libs, {type: 'normal'});
              let tumour = _.find(lims_libs, {type: 'tumour'});
              let transcriptome = _.find(lims_libs, {type: 'transcriptome'});
              
              // Find Normal
              // Check that the library's collection date isn't out of scope for this tracking biopsy
              //console.log(pogid, lims_biopsy_date, moment(lims_biopsy_date).unix(), tracking_analysis.createdAt, moment(tracking_analysis.createdAt).unix());
              
              if(Math.abs(moment(tracking_analysis.createdAt).unix() - moment(lims_biopsy_date).unix()) > this.maxPathWindow) {
                logger.info('Tracking event ' + pogid + ' ' + tracking_analysis.task.ident + ' has a LIMS biopsy event out of the acceptable max pathology waiting window.');
                return;
              }
              
              if(!normal || !tumour || !transcriptome) return;
              
              this.pog_analyses[pogid][track_i].libraries = {};
              
              if(normal) this.pog_analyses[pogid][track_i].libraries.normal = normal.name;
              if(tumour) this.pog_analyses[pogid][track_i].libraries.tumour = tumour.name;
              if(transcriptome) this.pog_analyses[pogid][track_i].libraries.transcriptome = transcriptome.name;
              
              // Update Entries
              this.pog_analyses[pogid][track_i].disease = tumour.disease.trim();
              this.pog_analyses[pogid][track_i].pathDetected = true;
              this.pog_analyses[pogid][track_i].status = 'complete';
              
            });
            
          });
          
        }
        
      });
      
      //console.log('Have tracking waiting for', pogid, tracking);
      resolve();
      
    });
    
  }
  
  /**
   * Update IPR tracking with LIMs results
   *
   * Parse updated POG libraries into IPR data, and update tracking
   *
   * @returns {Promise}
   */
  updateIprTracking() {
    return new Promise((resolve, reject) => {
      
      //console.log('Ready to update IPR', JSON.stringify(this.pogs));
      
      let promises = [];
      let states = [];
      let report_opts = [];
      
      // Loop over pog analyses
      _.forEach(this.pog_analyses, (analyses, pogid) => {
        
        // Loop over each analysis
        _.forEach(analyses, (analysis) => {
          
          if(!analysis.pathDetected) {
            logger.info('Pathology not detected for ' + pogid);
            return;
          }
          
          // add State IDs to array
          states.push(analysis.task.state.id);
          
          // Update Analysis
          let opts = {
            where: {
              ident: analysis.ident,
            }
          };
          let data = {
            libraries: analysis.libraries,
            disease: analysis.disease,
          };
          
          // Add future analysis_report updates
          report_opts.push({opts: opts, data: data});
          
        });
        
      });
      
      // Get all the tasks that need to be updated
      this.retrieveTrackingTasks(states).then(
        (tasks) => {
          
          let task_promises = [];
          
          //Promise.all(task_promises).then(
          Promise.all(_.map(tasks, (t) => { let e = new Task(t); e.checkIn(this.user, moment().toISOString())})).then(
            (result) => {
              
              Promise.all(_.map(report_opts, (r) => { return db.models.pog_analysis.update(r.data, r.opts) })).then(
                (result) => {
                  // Update Analysis
                  logger.info('Checked in all ready tasks');
                  resolve();
                  
                })
                .catch((err) => {
                  reject({message: 'Unable to update analysis_reports: ' + err.message, cause: err});
                });
              
            })
            .catch((err) => {
              logger.error('Failed to update tracking ' + err.message);
              reject({message: 'Failed to update tracking ' + err.message, cause: err});
              console.log(err);
            });
          
        })
        .catch((err) => {
          logger.warn('Failed to retrieve tasks for updating tracking: ' + err.message);
          console.log(err);
        });
      
      
    });
  }
  
  /**
   * Retrieve Tracking Tasks
   *
   * @param {array} state_ids - State id for tracking tasks
   * @return {Promise|array} - Resolves with array of tracking tasks
   */
  retrieveTrackingTasks(state_ids) {
    return new Promise((resolve, reject) => {
      
      logger.debug('Retrieving tasks for states: ', state_ids.join(','));
      
      let opts = {
        where: {
          slug: {$in: [
            'tumour_recieved',
            'blood_received',
            'pathology_passed'
          ]},
          state_id: {$in: state_ids }
        },
        include: [
          {as: 'state', model: db.models.tracking_state},
          {as: 'checkins', model: db.models.tracking_state_task_checkin}
        ]
      };
      
      db.models.tracking_state_task.findAll(opts).then(
        (tasks) => {
          resolve(tasks);
        })
        .catch((err) => {
          logger.error('Failed to retrieve all tracking tasks for this state: ' + state_id);
          reject({message: 'Failed to retrieve all tracking tasks for this state.', cause: err});
          console.log(err);
        });
      
    });
  }
  
  
  /**
   * TODO: Trigger hooks
   *
   * @returns {Promise}
   */
  triggerHooks() {
    return new Promise((resolve, reject) => {
    
    });
  }
  
  /**
   * Get and save Syncro User
   *
   * @returns {Promise}
   * @private
   */
  _getSyncUser () {
    
    return new Promise((resolve, reject) => {
      
      db.models.user.findOne({where: {username: 'synchro'}}).then(
        (user) => {
          this.user = user;
          
          if(user === null) reject({message: 'Unable to get Syncro user'});
          resolve();
        },
        (err) => {
          console.log('Error!', err);
          reject({message: 'Unable to get Syncro user: ' + err.message});
        });
    });
    
  }
  
  /**
   * Reset Library
   *
   * @private
   */
  _reset() {
    this.pogids = [];             // POGIDs that need to be check for Path passed
    this.pog_analyses = {};       // Analyses being tracked
    this.pogs = {};               // Processed POGs from LIMS
    this.diseaseLibraries = [];   // Libraries that need resolution from LIMS Library API
    this.user = null;             // Sync User
  }
  
}

module.exports = BioAppsSync;