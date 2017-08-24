"use strict";


const Syncro      = require(process.cwd() + '/app/synchronizer/synchro'); // Import syncronizer Object
const db          = require(process.cwd() + '/app/models/'); // Load database
const $lims       = require(process.cwd() + '/app/api/lims');
const _           = require('lodash');
const moment      = require('moment');

//let logger        = require('winston'); // Load logging library
let logger        = process.logger;

let LimsSync = new Syncro(5000, 'dryrun');

// Start Syncronizer
//LimsSync.start();

logger.info('Starting LIMS Sync');

class LimsPathologySync {
  
  constructor (options={}) {
    this.dryrun = options.dryrun || false;
    this.pogids = [];             // POGIDs that need to be check for Path passed
    this.pog_analyses = {};       // Analyses being tracked
    this.pogs = {};               // Processed POGs from LIMS
    this.diseaseLibraries = [];   // Libraries that need resolution from LIMS Library API
    this.maxPathWindow = options.maxPathWindow || "2592000"; // Max number of seconds to wait between creation of tracking and biopsy event (used to diff multiple biopsies)
  }
  
  /**
   * Initialize syncronization task
   *
   * @returns {Promise}
   */
  init() {
    return new Promise((resolve, reject) => {
      
      this.getTasksPendingPath()
        .then(this.queryLimsSample.bind(this))
        .then(this._parseLimsSampleResults.bind(this))
        .then(this.queryLimsLibrary.bind(this))
        .then(this._parseLimsLibraryResults.bind(this))
        .then(this.sortLibraryToBiopsy.bind(this))
        .then(this.updateIprTracking.bind(this))
        .then((result) => {
          console.log('Outcome', result);
        })
        .catch((err) => {
          console.log('Failed to run Syncro');
          console.log(err);
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
        include: [
          {as: 'state', model: db.models.tracking_state.scope('noTasks'), }
        ]
      };
  
      logger.info('Querying DB for all tracking tasks without pathology');
  
      db.models.tracking_state_task.findAll(opt).then(
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
              task: {
                ident: r.ident,
                status: r.status,
                name: r.name,
                slug: r.slug
              },
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
              
              //console.log('normal', normal);
              //console.log('tumour', tumour);
              //console.log('transcriptome', transcriptome);
              
              this.pog_analyses[pogid][track_i].libraries = {
                normal: normal.name,
                tumour: tumour.name,
                transcriptome: transcriptome.name,
              };
              this.pog_analyses[pogid][track_i].pathDetected = true;
              this.pog_analyses[pogid][track_i].status = 'complete';
              
              
            });
            
          });
          
        }
        
      });
  
      //console.log('Have tracking waiting for', pogid, tracking);
      console.log('Finished lims/tracking sync', JSON.stringify(this.pog_analyses));
    
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
    
      console.log('Ready to update IPR', JSON.stringify(this.pogs));
      
    
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

}


let run = new LimsPathologySync({});
run.init();

/*
let limsPathologySync = () => {
  return new Promise((resolve, reject) => {
    // First get list of all tracking cases that exist without path pass
    let opt = {
      where: {
        slug: 'pathology_passed',
        deletedAt: null
      },
      include: [
        {as: 'state', model: db.models.tracking_state.scope('noTasks'), }
      ],
      limit: 1
    };
  
    logger.info('Querying DB for all tracking tasks without pathology');
    
    db.models.tracking_state_task.findAll(opt).then(
      (result) => {
        
        let pogs = [];
        
        // Loop over results
        _.forEach(result, (r) => {
          pogs.push(r.state.analysis.pog.POGID);
        });
        
        logger.info('Querying LIMS for sample details for supplied POGs');
        
        queryLimsSample(pogs);
        
        resolve(pogs);
      },
      (err) => {
        console.log('Unable to retrieve pending pathology tasks', err);
        reject({message: 'Unable to retrieve pathology tasks', cause: err.message});
      }
    )
  });
  
};



let queryLimsSample = (pogids) => {

  return new Promise((resolve, reject) => {
    
    let diseaseLibraries = [];
    
    $lims.sample(pogids).then(
      (result) => {
        
        logger.info('Founding ' + result.results.length + ' Results from LIMS sample endpoint.');
        
        let pogs = {};
        
        // Group into POGs
        _.forEach(result.results, (sample) => {
          
          let pogid = sample.participant_study_id;
          let datestamp = sample.sample_collection_time.substring(0,10);
          
          let library = {
            name: sample.library,
            type: (sample.disease_status === 'Normal') ? 'normal' : null,
            source: sample.original_source_name,
            disease: sample.disease
          };
          
          if(sample.disease_status === 'Diseased') {
            diseaseLibraries.push(sample.library);
          }
          
          if(!pogs[pogid]) pogs[pogid] = {};
          if(!pogs[pogid][datestamp]) pogs[pogid][datestamp] = [];
          if(!_.find(pogs[pogid][datestamp], {name: library.name})) {
            pogs[pogid][datestamp].push(library);
            logger.debug('Setting ' + library.name + ' for ' + pogid + ' biopsy ' + datestamp + ((library.type !== null) ? ' | library type detected: ' + library.type : ''));
          }
          
        });
        
        logger.info('Resulting in ' + Object.keys(pogs).length + ' POGs that have pathology information and need biopsy library details.');
        
        $lims.library(diseaseLibraries).then(
          (libraryDetails) => {
            
            logger.info('Recieved ' + libraryDetails.results.length + ' libraries from LIMS library endpoint.');
            
            // Loop over found libraries
            _.forEach(libraryDetails.results, (library) => {
              
              // Grab associated POG biopsies
              let pog = pogs[library.full_name.split('-')[0]];
              
              // Loop over biopsies
              _.forEach(pog, (libraries, biopsy_date) => {
                
                let i = _.findKey(libraries, {name: library.name});
                
                logger.debug('Found mapped POG biopsy entry for ' + library.name + ' in position ' + i + ' in biopsy ' + biopsy_date + ' for ' + library.full_name.split('-')[0]);
                
                if(i) {
                  if(library.library_strategy === 'WGS') pogs[library.full_name.split('-')[0]][biopsy_date][i].type = 'tumour';
                  if(library.library_strategy.indexOf('RNA') > -1) pogs[library.full_name.split('-')[0]][biopsy_date][i].type = 'transcriptome';
                }
                
              });
              
            });
            
            // Loop over each library, and
            //console.log(JSON.stringify(pogs));
            
            logger.info('Finished receiving library details.');
            
          }
        )
          .catch((err) => {
            console.log('Failed to get library details', err);
          });
        
      }
    ).catch((err) => {
      console.log('Failed LIMS query', err);
    });
  
  });
  
};
*/

//LimsSync.registerHook('PassedPathology', 10000, limsPathologySync);

module.exports = LimsSync;