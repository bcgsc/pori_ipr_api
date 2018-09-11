"use strict";
/*
 IPR-API - Integrated Pipeline Reports API

 COPYRIGHT 2016 MICHAEL SMITH GENOME SCIENCES CENTRE
 CONFIDENTIAL -- FOR RESEARCH PURPOSES ONLY
 
 Author: Brandon Pierce <bpierce@bcgsc.ca>
 Support JIRA ticket space: DEVSU

 This Node.JS script is designed to be run in ES6ES6 compliant mode

*/


const Syncro      = require(process.cwd() + '/app/synchronizer/synchro'); // Import syncronizer Object
const db          = require(process.cwd() + '/app/models/'); // Load database
const $lims       = require(process.cwd() + '/app/api/lims');
const _           = require('lodash');
const moment      = require('moment');
const Task        = require('../task');
const State       = require('../state');

//let logger        = require('winston'); // Load logging library
let logger        = process.logger;

logger.info('Starting LIMS Sync');

class LimsPathologySync {
  
  constructor (options={}) {
    this.dryrun = options.dryrun || false;
    this.pogids = [];             // POGIDs that need to be check for Path passed
    this.pog_analyses = {};       // Analyses being tracked
    this.pogs = {};               // Processed POGs from LIMS
    this.diseaseLibraries = [];   // Libraries that need resolution from LIMS Library API
    this.user = null;             // Sync User
    //this.maxPathWindow = options.maxPathWindow || (50 * 86400); // (50 Days) Max number of seconds to wait between creation of tracking and biopsy event (used to diff multiple biopsies)
    this.maxPathWindow = options.maxPathWindow || (90 * 86400); // (90 Days) Max number of seconds to wait between creation of tracking and biopsy event (used to diff multiple biopsies)
  }
  
  /**
   * Initialize syncronization task
   *
   * @returns {Promise}
   */
  init() {
    return new Promise((resolve, reject) => {
      
      this.getTasksPendingPath()                          // 1. Get Tasks pending pathology passed
        .then(this._getSyncUser.bind(this))               // 2. Get the Sync user account
        .then(this.queryLimsSample.bind(this))            // 3. Query LIMS api with list of POGs awaiting Path passed
        .then(this._parseLimsSampleResults.bind(this))    // 4. Parse the results from LIMS sample api
        .then(this.queryLimsLibrary.bind(this))           // 5. Query LIMS Library API to differentiate Tumour/Normal DNA libraries
        .then(this._parseLimsLibraryResults.bind(this))   // 6. Parse results from LIMS Library API
        .then(this.sortLibraryToBiopsy.bind(this))        // 7. Sort LIMS result data into update queries for IPR Tracking DB
        .then(this.updateIprTracking.bind(this))          // 8. Update the IPR Tracking API/DB with results
        .then((result) => {                               // 9. Profit.
          
          logger.info('Finished processing Pathology Passed LIMS sync.');
          resolve({summary: 'Finished running pathology check.', result: result});
          this._reset(); // Reset
          
        })
        .catch((err) => {
        
          logger.error('Failed to complete Pathology Passed LIMS sync: ' + err.message);
          console.log(err);
          resolve({summary: 'Finished running pathology check with errors', result: err});
          this._reset(); // Reset
          
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
          '$state.status$': {$in: [
            'active',
          ]},
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
          
          // If no results, send empty
          if(!pogs || !pogs.results) return resolve([]);
          
          logger.info(`Found ${pogs.results.length} results from LIMS sample endpoint.`);
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
      
      // If no results, continue
      if(pogs.length === 0) return resolve([]);
      
      _.forEach(pogs, (sample) => {
        
        let pogid = sample.participant_study_id;
        let datestamp;
        try {
          datestamp = (sample.sample_collection_time) ? sample.sample_collection_time.substring(0, 10) : moment().format('YYYY-MM-DD');
        }
        catch (e) {
          console.log('Error', e);
          console.log('POG: ', pogid);
        }
        
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
      
      logger.info('Resulting in ' + this.diseaseLibraries.length + ' disease libraries that have pathology information and need additional library details to differentiate RNA vs DNA.');
      
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
      
      if(this.diseaseLibraries.length === 0) {
        logger.info('Zero disease libraries requiring lookup');
        return resolve();
      }
      
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
   * Differentiate RNA from DNA libraries, and sort into POG object
   *
   * @param {array} libraries - Array of libraries found by LIMS library API
   * @returns {Promise}
   * @private
   */
  _parseLimsLibraryResults(libraries) {
    
    return new Promise((resolve, reject) => {
  
      _.forEach(libraries, (library) => {
        
        // Grab associated POG biopsies
        let pog = this.pogs[library.full_name.split('-')[0]];
        
        // Loop over biopsies
        _.forEach(pog, (libraries, biopsy_date) => {
          
          // The index key of the library we're looking for
          let i = _.findKey(libraries, {name: library.name});
          
          if(!i) return;
          
          logger.debug('Found mapped POG biopsy entry for ' + library.name + ' in position ' + i + ' in biopsy ' + biopsy_date + ' for ' + library.full_name.split('-')[0]);
          
          // If the index is valid, store the updated data
          if(i) {
            // Types of library strategy mappings
            if(library.library_strategy === 'WGS') this.pogs[library.full_name.split('-')[0]][biopsy_date][i].type = 'tumour';
            if(library.library_strategy.indexOf('RNA') > -1) this.pogs[library.full_name.split('-')[0]][biopsy_date][i].type = 'transcriptome';
          }
          
        });
        
      });
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
              
              // Find the libraries for each type
              let normal = _.find(lims_libs, {type: 'normal'});
              let tumour = _.find(lims_libs, {type: 'tumour'});
              let transcriptome = _.find(lims_libs, {type: 'transcriptome'});
              
              // Check that the biopsy overlap window is respected
              if(Math.abs(moment(tracking_analysis.createdAt).unix() - moment(lims_biopsy_date).unix()) > this.maxPathWindow) {
                logger.info('Tracking event ' + pogid + ' ' + tracking_analysis.task.name + ' (' + tracking_analysis.clinical_biopsy + ') has a LIMS biopsy event out of the acceptable max pathology waiting window.');
                return;
              }
              
              // Check for other normals if one is not in this biopsy date.
              if(!normal) {
                // Loop over all biopsies
                _.forEach(lims_biops, (biop) => {
                  // If already set, continue.
                  if(normal) return;
                  // Find a normal
                  normal = _.find(biop, {type: 'normal'});
                });
              }
              
              // Make sure there are 3 libraries ready to go.
              if(!normal || !tumour || !transcriptome) return;
              
              this.pog_analyses[pogid][track_i].libraries = {};
  
              if(normal) {
                this.pog_analyses[pogid][track_i].libraries.normal = normal.name;
                logger.info('Set normal library ' + normal.name + ' for ' + pogid + ' (' + this.pog_analyses[pogid][track_i].clinical_biopsy + ')');
              }
              if(tumour) {
                this.pog_analyses[pogid][track_i].libraries.tumour = tumour.name;
                logger.info('Set tumour library ' + tumour.name + ' for ' + pogid + ' (' + this.pog_analyses[pogid][track_i].clinical_biopsy + ')');
              }
              if(transcriptome) {
                this.pog_analyses[pogid][track_i].libraries.transcriptome = transcriptome.name;
                logger.info('Set transcriptome library ' + transcriptome.name + ' for ' + pogid + ' (' + this.pog_analyses[pogid][track_i].clinical_biopsy + ')');
              }
              
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
      
      let promises = [];
      let states = [];
      let report_opts = [];
      
      // Loop over pog analyses
      _.forEach(this.pog_analyses, (analyses, pogid) => {
        
        // Loop over each analysis
        _.forEach(analyses, (analysis) => {
          
          if(!analysis.pathDetected) {
            logger.info('Pathology not detected for ' + pogid + ' (' + analysis.clinical_biopsy + ')');
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
          
          Promise.all(_.map(tasks, (t) => { let e = new Task(t); return e.checkIn(this.user, moment().toISOString())})).then( // Check in tasks
          (result) => {
            let checkStatesForCompletion = _.uniqBy(_.map(tasks, 'state'), 'state_id'); // Get set of states that had tasks updated
            logger.debug(`Checking ${checkStatesForCompletion.length} state(s) for completion`);
            return Promise.all(_.map(checkStatesForCompletion, (s) => {let state = new State(s); return state.checkCompleted();})) // Check if states are complete
          }).then(() => {
            return Promise.all(_.map(report_opts, (r) => { return db.models.pog_analysis.update(r.data, r.opts) })); // Update fields in analysis
          }).then((result) => {
            logger.info('Checked in all ready tasks');
            resolve();
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
            'tumour_received',
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

//let run = new LimsPathologySync({});
//run.init();

module.exports = LimsPathologySync;