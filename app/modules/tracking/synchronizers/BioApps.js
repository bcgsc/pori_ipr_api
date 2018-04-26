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
      .then(this.getSymlinksRequired.bind(this))            // 11. Get tasks with Symlink required pending  //
      .then(this.querySymlinksCreated.bind(this))           // 12. Query BioApps to see which tasks have completed symlink creation (check if aligned libcore has file_path and is successful)
      .then(this.parseSymlinksCreated.bind(this))           // 13. Parse response from BioApps and update tracking
      .then((result) => {                                   // 14. Profit.
        
        logger.info('Finished processing BioApps syncing.');
        resolve({summary: 'Finished running BioApps check.', result: result});
        this._reset(); // Reset
        
      })
      .catch((err) => {
        logger.error('Failed to complete BioApps sync: ' + err.message);
        console.log(err);
        this._reset(); // Reset
        resolve({message: 'Failed to complete all tasks in BioApps sync: ', result: err.message});
        
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
      
      logger.debug(`Patients to be sync'd: ${patients.length}`);
      
      // Create POGID => Task map
      _.forEach(this.cache.tasks.patients, (p) => { pogs[p.state.analysis.pog.POGID] = p });
      
      // Loop over patient results and prep payloads
      _.forEach(patients, (p) => {
        if(p.length === 0) return;
        
        p = p[0]; // Remove array wrapper
        
        let libraries = [];
        let task = null;
        let source = null;
        let source_analysis_setting = null;
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
        
        // Workaround, would rather sort by createdAt
        p.sources = _.sortBy(p.sources, 'id');
        
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
        
        
        try {
          source.source_analysis_settings = _.sortBy(source.source_analysis_settings, 'data_version');
          source_analysis_setting = _.last(source.source_analysis_settings);
          
          // With a source Found, time to build the update for this case;
          update.data.analysis_biopsy = 'biop'.concat(source_analysis_setting.biopsy_number);
          update.data.bioapps_source_id = source.id;
          update.data.biopsy_site = source.anatomic_site;
  
          // Three Letter Code
          update.data.threeLetterCode = source_analysis_setting.cancer_group.code;
        }
        catch (e) {
          logger.error('BioApps source analysis settings missing required details: ' + e.message);
          return;
        }
  
        let parsedSettings = $bioapps.parseSourceSettings(source);
        
        // Compile Disease Comparator
        update.data.comparator_disease = {
          analysis: parsedSettings.disease_comparator_analysis,
          all: parsedSettings.disease_comparators,
          tumour_type_report: parsedSettings.tumour_type_report,
          tumour_type_kb: parsedSettings.tumour_type_kb
        };
        
        update.data.comparator_normal = {
          normal_primary: parsedSettings.normal_primary,
          normal_biopsy: parsedSettings.normal_biopsy,
          gtex_primary: parsedSettings.gtex_primary,
          gtex_biopsy: parsedSettings.gtex_biopsy
        };        
        
        // Set update where clause.
        update.where = { ident: task.state.analysis.ident };
        
        update.task = task;
  
        queries.push(update);

        logger.info('Syncing patient info for ' + source.participant_study_identifier + ' (' + task.state.analysis.clinical_biopsy + ')');
      
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
   * Get all tasks that require symlink checking
   *
   * @returns {Promise}
   */
  getSymlinksRequired() {
    return new Promise((resolve, reject) => {
      
      // Query Params
      let opt = {
        where: {
          slug: 'bioapps_symlinks_created',
          deletedAt: null,
          status: ['pending', 'active', 'failed'],
        },
        attributes: {
          include: ['state_id']
        },
        include: [
          {as: 'state', model: db.models.tracking_state.scope('noTasks'), }
        ]
      };
      
      logger.info('Querying DB for all tracking tasks with symlinks pending');
      
      db.models.tracking_state_task.scope('public').findAll(opt)
        .then((tasks) => {
          logger.info('Tasks requiring symlink lookup', tasks.length);
          this.cache.tasks.symlinks = tasks;
          resolve(tasks);
        })
        .catch((err) => {
          logger.error('Unable to retrieve pending symlink tasks', err);
          reject({message: 'Unable to retrieve symlink tasks', cause: err.message});
        });
      
    });
  }
  
  /**
   * Get all tasks that require symlink checking
   *
   * @returns {Promise}
   */
  querySymlinksCreated() {
    return new Promise((resolve, reject) => {
      // Get target number of lanes for all libraries
      let libs = [];
      let libcores = {};
      
      _.forEach(this.cache.tasks.symlinks, (t) => {
        // Extract libraries
        libs.push(_.values(t.state.analysis.libraries));
      });
  
      // Flatten nested arrays
      libs = _.flatten(libs);
  
      logger.info(`Starting query for retrieving library lane targets for ${libs.length} libraries`);
      
      // Query BioApps for Target number of lanes
      $bioapps.libraryAlignedCores(_.join(libs, ','))
        .then((query_response) => {
          _.forEach(query_response, (lib) => {
            if(!libcores[lib.libcore.library.name]) libcores[lib.libcore.library.name] = [];
            libcores[lib.libcore.library.name].push(lib);
          });
          
          resolve(libcores);
        })
        .catch((err) => {
          // Failed
          reject({message: 'Failed to get target lanes & aligned libcore counts from BioApps'});
          console.log(err);
        });
      // Get number of aligned libcores (and therefore symlinks created if target met)
      
    });
  }
  
  
  /**
   * Parse Targets and Libcore values
   *
   * Determine if the target number of aligned libcores has been hit. If it has, we can infer that symlinks have
   * been created.
   *
   * @param {object} libcores - Hashmap of library names with arrays of aligned libcores
   *
   * @returns {Promise} - Resolves with nothing.
   */
  parseSymlinksCreated(libcores) {
    return new Promise((resolve, reject) => {
      
      let requireCheckin = [];
      
      // Loop over tasks, and determine which need checkins
      _.forEach(this.cache.tasks.symlinks, (t) => {
        
        // Start with false assumption - attempt to prove.
        let targetReached = {
          normal: false,
          tumour: false,
          transcriptome: false
        };
        
        // Function for checking all libcores have files & are successful
        let checkLibCoreComplete = (library) => {
          let resp = true; // Assume it's done, and try to disprove.
          
          // Loop over cores and check their file & success
          _.forEach(library, (core) => {
            if(core.data_path === null) resp = false; // Data path is there?
            if(core.successful === false) resp = false; // Success flag is present?
          });
          return resp;
        };
        
        // Pull results for each library
        if(libcores[t.state.analysis.libraries.normal]) targetReached.normal = checkLibCoreComplete(libcores[t.state.analysis.libraries.normal]); // Normal
        if(libcores[t.state.analysis.libraries.tumour]) targetReached.tumour = checkLibCoreComplete(libcores[t.state.analysis.libraries.tumour]); // Tumour
        if(libcores[t.state.analysis.libraries.transcriptome]) targetReached.transcriptome = checkLibCoreComplete(libcores[t.state.analysis.libraries.transcriptome]); // Transcriptome
        
        // All goals reached?
        if(targetReached.normal && targetReached.tumour && targetReached.transcriptome) requireCheckin.push(t);
        
      });
      
      // Map checkins
      // For each completed task, check-in!
      Promise.all(_.map(requireCheckin, (t) => { let task = new Task(t); return task.checkIn(this.user, true); }))
        .then((results) => {
          logger.info('Checked in symlinks for ' + results.length + ' tasks.');
          resolve(true);
        })
        .catch((err) => {
          logger.error('Failed to check in symlinks: ' + err.message);
        });
      
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