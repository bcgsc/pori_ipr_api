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

let logger        = process.logger;

logger.info('Starting LIMS Sync');

class LimsSeqSync {
  
  constructor (options={}) {
    this.dryrun = options.dryrun || false;
    this.pogids = [];             // POGIDs that need to be check for Path passed
    this.pog_analyses = {};       // Analyses being tracked
    this.pogs = {};               // Processed POGs from LIMS
    this.diseaseLibraries = [];   // Libraries that need resolution from LIMS Library API
    this.user = null;             // Sync User
    this.maxPathWindow = options.maxPathWindow || "2592000"; // Max number of seconds to wait between creation of tracking and biopsy event (used to diff multiple biopsies)
    
    this.sequencing_submit = [];
    this.illumina_run_failed_status = ['Failed', 'Aborted', 'Expired'] // Possible "FAIL" status codes for illumina runs
  }
  
  /**
   * Initialize syncronization task
   *
   * @returns {Promise}
   */
  init() {
    return new Promise((resolve, reject) => {
      
      this._getSyncUser()                                               // 1. Summon Synchro Bot
        .then(this.getTasksPendingSequencingSubmission.bind(this))      // 2. Look for tasks pending sequencing submission
        .then(this.getTasksPendingSequenceComplete.bind(this))          // 3. Look for tasks pending sequencing completion
        .then(this.getTasksPendingSequenceValidation.bind(this))        // 4. Look for tasks pending sequencing validation
        .then(this.getTasksPendingSequenceQC0.bind(this))               // 5. Look for tasks pending sequencing QC0
        .then((results) => {
          logger.info('Finished LIMS Sequencing Synchro');
          resolve({summary: 'Finished running sequencing check', result: results});
        })
        .catch((err) => {
          logger.debug('Failed to update tasks pending sequencing submission');
          console.log(err);
          resolve({summary: 'Errors during sequencing checks', result: err});
        });
      
    });
  }
  
  /**
   * Get list of tasks that need sequencing submission boolean results
   *
   * @returns {Promise}
   */
  getTasksPendingSequencingSubmission() {
    return new Promise((resolve, reject) => {
      
      let opt = {
        where: {
          slug: 'sequencing_submit',
          status: {$not: 'complete'},
          deletedAt: null
        },
        attributes: {
          include: ['state_id']
        },
        include: [
          {as: 'state', model: db.models.tracking_state.scope('noTasks'), }
        ]
      };
      
      logger.info('Querying DB for all tracking tasks without sequencing started');
      
      db.models.tracking_state_task.scope('public').findAll(opt).then(
        (tasks) => {
          logger.info('Found ' + tasks.length + ' case requiring sequence lookup');
          this.sequencing_submit = tasks;
          
          logger.debug('Number of tasks attempting to start: ', tasks.length);
          
          Promise.all(_.map(tasks, (t) => { return this.checkTaskSequenceSubmitted(t) }))
            .then((result) => {
              logger.info('Finished processing sequencing submitted tasks');
              resolve();
            })
            .catch((err) => {
              console.log('Err', err);
              logger.error('Failed to process sequencing submitted tasks');
            });
          
        })
        .catch((err) => {
          logger.error('Unable to search for tasks that are pending sequencing submission');
        });
      
    });
  }
  
  /**
   * Lookup libraries in LIMS for sequencing submission entries
   *
   * @param {object} task - DB model object for a task
   * @returns {Promise}
   */
  checkTaskSequenceSubmitted(task) {
    
    return new Promise((resolve, reject) => {
      
      if(task === null || task === undefined) return reject({message: 'Empty task object passed to checkTaskSequenceSubmitted'});
      
      let allLibrariesStarted = true;  // Assume they're all done, and wait to disprove. (single fail = all fail)
      let libraries = _.invert(task.state.analysis.libraries); // Invert keys & libraries. Doesn't matter which library hasn't started to fail task
      _.mapValues(libraries, () => false); // Set all libraries to false;
      
      // Lookup task's analysis libraries in LIMS illumina runs
      $lims.illuminaRun(Object.keys(libraries)).then(
        (response) => {
          
          let intersections = [];
          
          // Check if the library has entries
          _.forEach(response.results, (result) => {
            intersections = intersections.concat(_.intersection(Object.keys(libraries), result.multiplex_libraries)); // Check in pooled libraries
            intersections = intersections.concat(_.intersection(Object.keys(libraries), [result.library])); // Check for non-pooled libraries (normal)
          });
          
          intersections = _.uniq(intersections);
          
          logger.debug('Found ' + intersections.length + ' libraries that have started sequencing');
          
          _.forEach(Object.keys(libraries), (l) => {
            if(intersections.indexOf(l) === -1) allLibrariesStarted = false;
            if(intersections.indexOf(l) > -1) libraries[l] = true;
            
          });
          
          if(allLibrariesStarted) {
            let actionTask = new Task(task);
            actionTask.checkIn(this.user, moment().toISOString())
              .then((result) => {
                logger.info('[SeqSubmit] Checked-in task for :' + task.state.analysis.pog.POGID);
                resolve();
              })
              .catch((err) => {
                reject({message: 'Failed to check in completed task: ' + err.message, cause: err});
              });
            
          } else {
            // No checking in happening!
            logger.info('[SeqSubmit] Not ready to check in task for: ' + task.state.analysis.pog.POGID);
            resolve();
          }
          
        
        })
        .catch((err) => {
          reject({message: 'Failed to get LIMS Illumina run results: ' + err.message, cause: err});
        });
      
    });
    
  }
  
  /**
   * Get list of tasks that need sequencing completion boolean results
   *
   * @returns {Promise}
   */
  getTasksPendingSequenceComplete() {
    return new Promise((resolve, reject) => {
      
      let opt = {
        where: {
          slug: 'sequencing',
          status: {$not: 'complete'},
          deletedAt: null
        },
        attributes: {
          include: ['state_id']
        },
        include: [
          {as: 'state', model: db.models.tracking_state.scope('noTasks'), }
        ]
      };
      
      logger.info('Querying DB for all tracking tasks without sequencing completed');
      
      db.models.tracking_state_task.scope('public').findAll(opt).then(
        (tasks) => {
          logger.info('Found ' + tasks.length + ' case requiring sequence completion');
          this.sequencing_submit = tasks;
          
          logger.debug('Number of sequencing completed tasks starting: ', tasks.length);
          
          Promise.all(_.map(tasks, (t) => { return this.checkTaskSequenceCompleted(t) }))
            .then(() => {
              logger.info('Finished processing sequencing completed tasks');
              resolve();
            })
            .catch((err) => {
              console.log('Err', err);
              logger.error('Failed to process sequencing completed tasks');
            });
          
        })
        .catch((err) => {
          logger.error('Unable to search for tasks that are pending sequencing submission');
        });
      
    });
  }
  
  
  
  /**
   * Lookup libraries in LIMS for sequencing completed entries
   *
   * @param {object} task - DB model object for a task
   * @returns {Promise}
   */
  checkTaskSequenceCompleted(task) {
    
    return new Promise((resolve, reject) => {
      
      if(task === null || task === undefined) return reject({message: 'Empty task object passed to checkTaskSequenceSubmitted'});
      
      
      // Possible run scenarios and their default status
      let run_status = {
        failed: false,
        complete: true,
        active: false
      };
      
      // Setup Libraries for analysis
      let libraries = _.invert(task.state.analysis.libraries); // Invert keys & libraries. Doesn't matter which library hasn't started to fail task
      _.mapValues(libraries, () => false); // Set all libraries to false;
      
      // Lookup task's analysis libraries in LIMS illumina runs
      $lims.illuminaRun(Object.keys(libraries)).then(
        (response) => {
          
          let completed = [];
          let failed = [];
          
          // Check if the library has entries
          _.forEach(response.results, (result) => {
            if(result.status === 'Analyzed') {
              completed = completed.concat(_.intersection(Object.keys(libraries), result.multiplex_libraries)); // Check in pooled libraries
              completed = completed.concat(_.intersection(Object.keys(libraries), [result.library])); // Check for non-pooled libraries (normal)
            }
            
            // Failed run, collect the problem libraries
            if(this.illumina_run_failed_status.indexOf(result.status ) > -1) {
              failed = failed.concat(_.intersection(Object.keys(libraries), result.multiplex_libraries)); // Check in pooled libraries
              failed = failed.concat(_.intersection(Object.keys(libraries), [result.library])); // Check for non-pooled libraries (normal)
              run_status.failed = true;
            }
  
            if(result.status === 'In Process' || result.status === 'Analyzing') {
              run_status.active = true;
            }
          });
        
          // Filter uniques
          completed = _.uniq(completed);
          failed = _.uniq(failed);
          
          logger.debug('Found ' + completed.length + ' libraries that have completed sequencing');
          
          // Loop over all libraries and check to see if they're in the complete array
          _.forEach(Object.keys(libraries), (l) => {
            if(completed.indexOf(l) === -1) run_status.complete = false;
            if(completed.indexOf(l) > -1) libraries[l] = true;
          });
  
          let actionTask = new Task(task);
          
          // One or more libraries failed?
          if(run_status.failed) {
            
            // Set Task Status to Failed
            actionTask.setUnprotected({status: 'failed'});
            actionTask.save()
              .then((result) => {
                logger.warn('[SeqComplete] LIMS responded with failed library for:' + task.state.analysis.pog.POGID);
                resolve();
              })
              .catch((err) => {
                logger.error('[SeqComplete] Unable to update task as failed for: ' + task.state.analysis.pog.POGID);
              });
            
          }
          
          // Not done yet, still underway!
          if(run_status.active && !run_status.failed) {
            
            // Set task status to active
            actionTask.setStatus('active')
              .then((result) => {
                logger.info('[SeqComplete] One or more libraries are still actively being sequenced for :' + task.state.analysis.pog.POGID);
                resolve();
              })
              .catch((err) => {
                logger.error('[SeqComplete] Unable to update task as active for: ' + task.state.analysis.pog.POGID);
              });
              
          }
          
          // If they're all complete, lets blow this popsicle joint!
          if(run_status.complete && !run_status.failed) {
            actionTask.checkIn(this.user, moment().toISOString())
              .then((result) => {
                logger.info('[SeqComplete] Checked-in task for :' + task.state.analysis.pog.POGID);
                resolve();
              })
              .catch((err) => {
                reject({message: 'Failed to check in completed task: ' + err.message, cause: err});
              });
          }
          
          if(!run_status.complete && !run_status.failed) {
            logger.info('[SeqComplete] Sequencing complete still pending for:' + task.state.analysis.pog.POGID);
            resolve();
          }
          
          
        })
        .catch((err) => {
          reject({message: 'Failed to get LIMS Illumina run results: ' + err.message, cause: err});
        });
      
    });
    
  }
  
  
  
  /**
   * Get list of tasks that need sequencing validation results
   *
   * @returns {Promise}
   */
  getTasksPendingSequenceValidation() {
    return new Promise((resolve, reject) => {
      
      let state_include = {
        as: 'state',
        model: db.models.tracking_state,
        attributes: {
          exclude: ['deletedAt', 'analysis_id', 'createdBy_id', 'group_id']
        },
        include: [
          {as: 'analysis', model: db.models.pog_analysis.scope('public')},
        ],
        order: [
          ['ordinal', 'ASC']
        ]
      };
      
      let opt = {
        where: {
          slug: 'sequencing_validated',
          status: {$not: 'complete'},
          deletedAt: null
        },
        order:  [['ordinal', 'ASC']],
        attributes: {
          exclude: ['deletedAt', 'id', 'analysis_id', 'assignedTo_id', 'state_id']
        },
        include: [
          state_include,
          { as: 'checkins', model: db.models.tracking_state_task_checkin, separate: true }
        ]
      };
      
      logger.info('Querying DB for all tracking tasks without sequencing validated');
      
      db.models.tracking_state_task.findAll(opt)
        .then((tasks) => {
          logger.info('Found ' + tasks.length + ' cases requiring sequence validation');
          this.sequencing_submit = tasks;
          
          logger.debug('Number of tasks attempting to start: ', tasks.length);
          
          Promise.all(_.map(tasks, (t) => { return this.checkTaskSequenceValidation(t) }))
            .then(() => {
              logger.info('Finished processing sequencing validated tasks');
              resolve();
            })
            .catch((err) => {
              logger.error('Failed to process sequencing validated tasks');
              console.log('Err', err);
            });
          
        })
        .catch((err) => {
          logger.error('Unable to search for tasks that are pending sequencing validation');
          console.log(err);
        });
      
    });
  }
  
  
  /**
   * Lookup libraries in LIMS for sequencing validation entries
   *
   * @param {object} task - DB model object for a task
   * @returns {Promise}
   */
  checkTaskSequenceValidation(task) {
    
    return new Promise((resolve, reject) => {
      
      if(task === null || task === undefined) return reject({message: 'Empty task object passed to checkTaskSequenceSubmitted'});
      
      let run_status = {
        passed: true, // Single case false
        rejected: false // single case true
      };
      
      // Setup Libraries for analysis
      let libraries = _.invert(task.state.analysis.libraries); // Invert keys & libraries. Doesn't matter which library hasn't started to fail task
      _.mapValues(libraries, () => false); // Set all libraries to false;
      
      // Lookup task's analysis libraries in LIMS illumina runs
      $lims.illuminaRun(Object.keys(libraries)).then(
        (response) => {
          
          let passed = [];
          let rejected = [];
          
          // Check if the library has entries
          _.forEach(response.results, (result) => {
            if(result.approval === 'Approved') {
              passed = passed.concat(_.intersection(Object.keys(libraries), result.multiplex_libraries)); // Check in pooled libraries
              passed = passed.concat(_.intersection(Object.keys(libraries), [result.library])); // Check for non-pooled libraries (normal)
            }
            
            // Failed run, collect the problem libraries
            if(result.approval === 'Rejected') {
              rejected = rejected.concat(_.intersection(Object.keys(libraries), result.multiplex_libraries)); // Check in pooled libraries
              rejected = rejected.concat(_.intersection(Object.keys(libraries), [result.library])); // Check for non-pooled libraries (normal)
              run_status.rejected = true;
            }
            
          });
          
          // Filter uniques
          passed = _.uniq(passed);
          rejected = _.uniq(rejected);
          
          logger.debug('Found ' + passed.length + ' libraries that have passed validation for: ' + task.state.analysis.pog.POGID);
          
          // Loop over all libraries and check to see if they're in the complete array
          _.forEach(Object.keys(libraries), (l) => {
            if(passed.indexOf(l) === -1) run_status.passed = false;
            if(passed.indexOf(l) > -1) libraries[l] = true;
          });
          
          // Check to see if a rejected entry has since been passed
          if(_.difference(rejected, passed).length === 0) {
            run_status.rejected = false;
          }
          
          let actionTask = new Task(task);
  
          // One or more libraries failed?
          if(run_status.rejected) {
            
            // Set Task Status to Failed
            actionTask.setUnprotected({status: 'failed'});
            actionTask.instance.save()
              .then((result) => {
                logger.warn('[SeqValid] LIMS responded with failed library for:' + task.state.analysis.pog.POGID);
                resolve();
              })
              .catch((err) => {
                logger.error('[SeqValid] Unable to update task as failed for: ' + task.state.analysis.pog.POGID);
              });
          }
          
          // If they're all complete, lets blow this popsicle joint!
          if(run_status.passed && !run_status.failed) {
            actionTask.checkIn(this.user, true)
              .then((result) => {
                logger.info('[SeqValid] Checked-in task for: ' + task.state.analysis.pog.POGID);
                resolve();
              })
              .catch((err) => {
                reject({message: 'Failed to check in completed task: ' + err.message, cause: err});
              });
          }
          
          if(!run_status.passed && !run_status.failed) {
            logger.info('[SeqValid] Sequence validation still pending for: ' + task.state.analysis.pog.POGID);
            resolve();
          }
          
          
        })
        .catch((err) => {
          reject({message: 'Failed to get LIMS Illumina run results: ' + err.message, cause: err});
        });
      
    });
    
  }
  
  
  
  /**
   * Get list of tasks that need sequencing validation results
   *
   * @returns {Promise}
   */
  getTasksPendingSequenceQC0() {
    return new Promise((resolve, reject) => {
      
      let opt = {
        where: {
          slug: 'sequencing_qc0',
          status: {$not: 'complete'},
          deletedAt: null
        },
        attributes: {
          include: ['state_id']
        },
        include: [
          {as: 'state', model: db.models.tracking_state.scope('noTasks'), }
        ]
      };
      
      logger.info('Querying DB for all tracking tasks without sequencing QC0');
      
      db.models.tracking_state_task.scope('public').findAll(opt).then(
        (tasks) => {
          logger.info('Found ' + tasks.length + ' cases requiring sequence QC0');
          this.sequencing_submit = tasks;
          
          logger.debug('Number of tasks attempting to start: ', tasks.length);
          
          Promise.all(_.map(tasks, (t) => { return this.checkTaskSequenceQC0(t) }))
            .then(() => {
              logger.info('Finished processing sequencing QC0 tasks');
              resolve();
            })
            .catch((err) => {
              logger.error('Failed to process sequencing QC0 tasks');
              console.log('Err', err);
            });
          
        })
        .catch((err) => {
          logger.error('Unable to search for tasks that are pending sequencing QC0');
        });
      
    });
  }
  
  
  
  
  /**
   * Lookup libraries in LIMS for sequencing QC0 entries
   *
   * @param {object} task - DB model object for a task
   * @returns {Promise}
   */
  checkTaskSequenceQC0(task) {
    
    return new Promise((resolve, reject) => {
      
      if(task === null || task === undefined) return reject({message: 'Empty task object passed to checkTaskSequenceSubmitted'});
      
      let run_status = {
        passed: true, // Single case false
        failed: false // single case true
      };
      
      // Setup Libraries for analysis
      let libraries = _.invert(task.state.analysis.libraries); // Invert keys & libraries. Doesn't matter which library hasn't started to fail task
      _.mapValues(libraries, () => false); // Set all libraries to false;
      
      // Lookup task's analysis libraries in LIMS illumina runs
      $lims.illuminaRun(Object.keys(libraries)).then(
        (response) => {
          
          let passed = [];
          let failed = [];
          
          // Check if the library has entries
          _.forEach(response.results, (result) => {
            if(result.qc_status === 'Passed') {
              passed = passed.concat(_.intersection(Object.keys(libraries), result.multiplex_libraries)); // Check in pooled libraries
              passed = passed.concat(_.intersection(Object.keys(libraries), [result.library])); // Check for non-pooled libraries (normal)
            }
            
            // Failed run, collect the problem libraries
            if(result.qc_status === 'Failed') {
              failed = failed.concat(_.intersection(Object.keys(libraries), result.multiplex_libraries)); // Check in pooled libraries
              failed = failed.concat(_.intersection(Object.keys(libraries), [result.library])); // Check for non-pooled libraries (normal)
              run_status.failed = true;
            }
          });
          
          // Filter uniques
          passed = _.uniq(passed);
          failed = _.uniq(failed);
          
          logger.debug('Found ' + passed.length + ' libraries that have passed QC0 for: ' + task.state.analysis.pog.POGID);
          
          // Loop over all libraries and check to see if they're in the complete array
          _.forEach(Object.keys(libraries), (l) => {
            if(passed.indexOf(l) === -1) run_status.passed = false;
            if(passed.indexOf(l) > -1) libraries[l] = true;
          });
          
          // Check to see if a rejected entry has since been passed
          if(_.difference(failed, passed).length === 0) {
            run_status.failed = false;
          }
          let actionTask = new Task(task);
          
          // One or more libraries failed?
          if(run_status.failed) {
            
            // Set Task Status to Failed
            actionTask.setUnprotected({status: 'failed'});
            actionTask.instance.save()
              .then((result) => {
                logger.warn('[SeqQC0] LIMS responded with failed library for:' + task.state.analysis.pog.POGID);
                resolve();
              })
              .catch((err) => {
                logger.error('[SeqQC0] Unable to update task as failed for: ' + task.state.analysis.pog.POGID);
              });
          }
          
          // If they're all complete, lets blow this popsicle joint!
          if(run_status.passed && !run_status.failed) {
            actionTask.checkIn(this.user, true)
              .then((result) => {
                logger.info('[SeqQC0] Checked-in task for: ' + task.state.analysis.pog.POGID);
                resolve();
              })
              .catch((err) => {
                reject({message: 'Failed to check in completed task: ' + err.message, cause: err});
              });
          }
          
          if(!run_status.passed && !run_status.failed) {
            logger.info('[SeqQC0] QC0 still pending for: ' + task.state.analysis.pog.POGID);
            resolve();
          }
          
          
        })
        .catch((err) => {
          reject({message: 'Failed to get LIMS Illumina run results: ' + err.message, cause: err});
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
  
}


/*
let run = new LimsSeqSync({});
run.init().then((res) => {
  logger.info('Syncro Done');
});
*/

module.exports = LimsSeqSync;