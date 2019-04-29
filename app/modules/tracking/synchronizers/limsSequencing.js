const _ = require('lodash');
const moment = require('moment');
const db = require('../../../models');
const $lims = require('../../../api/lims');
const Task = require('../task');

const logger = require('../../../../lib/log');

logger.info('Starting LIMS Sync');

class LimsSeqSync {
  /**
   * Lims Sequence Sync
   *
   * @param {object} options - Options for sync (i.e if dryrun or not)
   * @property {boolean} dryrun - Whether it is a dry run or not
   * @property {Array.<string>} pogids - POGIDs that need to be check for Path passed
   * @property {object} pog_analyses - Analyses being tracked
   * @property {object} pogs - Processed POGs from LIMS
   * @property {Array.<object>} diseaseLibraries - Libraries that need resolution from LIMS Library API
   * @property {object} user - Sync user
   * @property {string} maxPathWindow - Max number of seconds to wait between creation of tracking and biopsy event (used to diff multiple biopsies)
   * @property {Array.<object>} sequencingSubmit - Submitted sequencing
   * @property {Array.<string>} illumina_run_failed_status - Possible "FAIL" status codes for illumina runs
   */
  constructor(options = {}) {
    this.dryrun = options.dryrun || false;
    this.pogids = [];
    this.pog_analyses = {};
    this.pogs = {};
    this.diseaseLibraries = [];
    this.user = null;
    this.maxPathWindow = options.maxPathWindow || '2592000';

    this.sequencingSubmit = [];
    this.illumina_run_failed_status = ['Failed', 'Aborted', 'Expired'];
  }

  /**
   * Initialize syncronization task
   *
   * @returns {Promise.<object>} - Returns results and summary
   */
  async init() {
    await this._getSyncUser(); // 1. Summon Synchro Bot
    await this.getTasksPendingSequencingSubmission(); // 2. Look for tasks pending sequencing submission
    await this.getTasksPendingSequenceComplete(); // 3. Look for tasks pending sequencing completion
    await this.getTasksPendingSequenceValidation(); // 4. Look for tasks pending sequencing validation
    await this.getTasksPendingSequenceQC0(); // 5. Look for tasks pending sequencing QC0

    logger.info('Finished LIMS Sequencing Synchro');
    return {summary: 'Finished running sequencing check', result: true};
  }

  /**
   * Get list of tasks that need sequencing submission boolean results
   *
   * @returns {Promise.<undefined>} - Doesn't return a value
   */
  async getTasksPendingSequencingSubmission() {
    const opt = {
      where: {
        slug: 'sequencing_submit',
        status: {$not: 'complete'},
        deletedAt: null,
        '$state.status$': {
          $in: [
            'active',
          ],
        },
      },
      attributes: {
        include: ['state_id'],
      },
      include: [
        {as: 'state', model: db.models.tracking_state.scope('noTasks')},
      ],
    };

    logger.info('Querying DB for all tracking tasks without sequencing started');

    let trackingStateTasks;
    try {
      trackingStateTasks = await db.models.tracking_state_task.scope('public').findAll(opt);
    } catch (error) {
      logger.error(`Error while finding tracking state tasks ${error}`);
      throw new Error({message: 'Error while finding tracking state tasks', cause: error});
    }

    logger.info(`Found ${trackingStateTasks.length} case requiring sequence lookup`);
    this.sequencing_submit = trackingStateTasks;
    logger.debug(`Number of tasks attempting to start: ${trackingStateTasks.length}`);

    try {
      const sequenceSubmittedPromises = trackingStateTasks.map((task) => {
        return this.checkTaskSequenceSubmitted(task);
      });

      await Promise.all(sequenceSubmittedPromises);
    } catch (error) {
      logger.error(`Failed to process sequencing submitted tasks ${error}`);
      throw new Error({message: 'Failed to process sequencing submitted tasks', cause: error});
    }

    logger.info('Finished processing sequencing submitted tasks');
  }

  /**
   * Lookup libraries in LIMS for sequencing submission entries
   *
   * @param {object} task - DB model object for a task
   * @returns {Promise.<undefined>} - Doesn't return a value
   */
  async checkTaskSequenceSubmitted(task) {
    if (!task) {
      logger.error('Empty task object passed to checkTaskSequenceSubmitted');
      throw new Error('Empty task object passed to checkTaskSequenceSubmitted');
    }

    // Assume they're all done, and wait to disprove. (single fail = all fail)
    let allLibrariesStarted = true;

    // Invert keys & libraries. Doesn't matter which library hasn't started to fail task
    const libraries = _.invert(task.state.analysis.libraries);
    _.mapValues(libraries, () => false); // Set all libraries to false;

    let response;
    try {
      response = await $lims.sequencerRun(Object.keys(libraries));
    } catch (error) {
      logger.error(`Failed to get LIMS sequencer run results: ${error.message}`);
      throw new Error({message: 'Failed to get LIMS sequencer run results', cause: error});
    }

    let intersections = [];

    // Check if the library has entries
    _.forEach(response.results, (result) => {
      intersections = intersections.concat(_.intersection(Object.keys(libraries), result.multiplexLibraryNames)); // Check in pooled libraries
      intersections = intersections.concat(_.intersection(Object.keys(libraries), [result.libraryName])); // Check for non-pooled libraries (normal)
    });

    intersections = _.uniq(intersections);

    logger.debug(`Found ${intersections.length} libraries that have started sequencing`);

    _.forEach(Object.keys(libraries), (library) => {
      if (!intersections.includes(library)) {
        allLibrariesStarted = false;
      } else {
        libraries[library] = true;
      }
    });

    if (allLibrariesStarted) {
      const actionTask = new Task(task);
      try {
        await actionTask.checkIn(this.user, moment().toISOString(), false, true);
        logger.info(`[SeqSubmit] Checked-in task for : ${task.state.analysis.pog.POGID}`);
      } catch (error) {
        logger.error(`[SeqSubmit] Failed to check in completed task for ${task.state.analysis.pog.POGID}: ${error.message}`);
        throw new Error(`[SeqSubmit] Failed to check in completed task for ${task.state.analysis.pog.POGID}: ${error.message}`);
      }
    } else {
      // No checking in happening!
      logger.info(`[SeqSubmit] Not ready to check in task for: ${task.state.analysis.pog.POGID}`);
    }
  }

  /**
   * Get list of tasks that need sequencing completion boolean results
   *
   * @returns {Promise.<undefined>} - Doesn't return a value
   */
  async getTasksPendingSequenceComplete() {
    const opt = {
      where: {
        slug: 'sequencing',
        status: {$not: 'complete'},
        deletedAt: null,
        '$state.status$': {
          $in: [
            'active',
          ],
        },
      },
      attributes: {
        include: ['state_id'],
      },
      include: [
        {as: 'state', model: db.models.tracking_state.scope('noTasks')},
      ],
    };

    logger.info('Querying DB for all tracking tasks without sequencing completed');

    let trackingStateTasks;
    try {
      trackingStateTasks = await db.models.tracking_state_task.scope('public').findAll(opt);
    } catch (error) {
      logger.error(`Unable to search for tasks that are pending sequencing submission ${error}`);
      throw new Error({message: 'Unable to search for tasks that are pending sequencing submission', cause: error});
    }

    logger.info(`Found ${trackingStateTasks.length} case requiring sequence completion`);
    this.sequencing_submit = trackingStateTasks;
    logger.debug(`Number of sequencing completed tasks starting: ${trackingStateTasks.length}`);

    try {
      const checkTaskPromises = trackingStateTasks.map((task) => {
        return this.checkTaskSequenceCompleted(task);
      });

      await Promise.all(checkTaskPromises);
    } catch (error) {
      logger.error(`Failed to process sequencing completed tasks ${error}`);
      throw new Error({message: 'Failed to process sequencing completed tasks', cause: error});
    }

    logger.info('Finished processing sequencing completed tasks');
  }

  /**
   * Lookup libraries in LIMS for sequencing completed entries
   *
   * @param {object} task - DB model object for a task
   * @returns {Promise.<undefined>} - Doesn't return a value
   */
  async checkTaskSequenceCompleted(task) {
    if (!task || task.length === 0) {
      logger.error('Empty task object passed to checkTaskSequenceCompleted');
      throw new Error('Empty task object passed to checkTaskSequenceCompleted');
    }

    // Possible run scenarios and their default status
    const runStatus = {
      failed: false,
      complete: true,
      active: false,
    };

    // Setup Libraries for analysis
    // Invert keys & libraries. Doesn't matter which library hasn't started to fail task
    const libraries = _.invert(task.state.analysis.libraries);
    _.mapValues(libraries, () => false); // Set all libraries to false;

    let sequencerRun;
    try {
      // Lookup task's analysis libraries in LIMS illumina runs
      sequencerRun = await $lims.sequencerRun(Object.keys(libraries));
    } catch (error) {
      logger.error(`Error while getting the LIMS sequencer run ${error}`);
      throw new Error('Error while getting the LIMS sequencer run');
    }

    let completed = [];
    let failed = [];

    // Check if the library has entries
    _.forEach(sequencerRun.results, (result) => {
      if (result.status === 'Analyzed') {
        completed = completed.concat(_.intersection(Object.keys(libraries), result.multiplexLibraryNames)); // Check in pooled libraries
        completed = completed.concat(_.intersection(Object.keys(libraries), [result.libraryName])); // Check for non-pooled libraries (normal)
      }

      // Failed run, collect the problem libraries
      if (this.illumina_run_failed_status.includes(result.status)) {
        failed = failed.concat(_.intersection(Object.keys(libraries), result.multiplexLibraryNames)); // Check in pooled libraries
        failed = failed.concat(_.intersection(Object.keys(libraries), [result.libraryName])); // Check for non-pooled libraries (normal)
      }

      if (result.status === 'In Process' || result.status === 'Analyzing') {
        runStatus.active = true;
      }
    });

    // Filter uniques
    completed = _.uniq(completed);
    failed = _.uniq(failed);

    for (const fail of failed) {
      if (!completed.includes(fail)) {
        runStatus.failed = true;
        break;
      }
    }

    logger.debug(`Found ${completed.length} libraries that have completed sequencing`);

    // Loop over all libraries and check to see if they're in the complete array
    _.forEach(Object.keys(libraries), (library) => {
      if (!completed.includes(library)) {
        runStatus.complete = false;
      } else {
        libraries[library] = true;
      }
    });

    const actionTask = new Task(task);

    // One or more libraries failed?
    if (runStatus.failed) {
      // Set Task Status to Failed
      actionTask.setUnprotected({status: 'failed'});
      try {
        await actionTask.save();
        logger.warn(`[SeqComplete] LIMS responded with failed library for: ${task.state.analysis.pog.POGID}`);
        return;
      } catch (error) {
        logger.error(`[SeqComplete] Unable to update task as failed for: ${task.state.analysis.pog.POGID}`);
      }
    }

    // Not done yet, still underway!
    if (runStatus.active && !runStatus.failed) {
      // Set task status to active
      try {
        await actionTask.setStatus('active');
        logger.info(`[SeqComplete] One or more libraries are still actively being sequenced for : ${task.state.analysis.pog.POGID}`);
        return;
      } catch (error) {
        logger.error(`[SeqComplete] Unable to update task as active for: ${task.state.analysis.pog.POGID}`);
      }
    }

    // If they're all complete, lets blow this popsicle joint!
    if (runStatus.complete && !runStatus.failed) {
      try {
        await actionTask.checkIn(this.user, moment().toISOString(), false, true);
        logger.info(`[SeqComplete] Checked-in task for: ${task.state.analysis.pog.POGID}`);
        return;
      } catch (error) {
        logger.error(`[SeqComplete] Failed to check in completed task for ${task.state.analysis.pog.POGID}: ${error.message}`);
        return;
      }
    }

    if (!runStatus.complete && !runStatus.failed) {
      logger.info(`[SeqComplete] Sequencing complete still pending for: ${task.state.analysis.pog.POGID}`);
    }
  }

  /**
   * Get list of tasks that need sequencing validation results
   *
   * @returns {Promise.<undefined>} - Doesn't return anything
   */
  async getTasksPendingSequenceValidation() {
    const stateInclude = {
      as: 'state',
      model: db.models.tracking_state,
      attributes: {
        exclude: ['deletedAt'],
      },
      include: [
        {as: 'analysis', model: db.models.pog_analysis.scope('public')},
      ],
      order: [
        ['ordinal', 'ASC'],
      ],
    };

    const opt = {
      where: {
        slug: 'sequencing_validated',
        status: {$not: 'complete'},
        deletedAt: null,
        '$state.status$': {
          $in: [
            'active',
          ],
        },
      },
      order: [['ordinal', 'ASC']],
      attributes: {
        exclude: ['deletedAt'],
      },
      include: [
        stateInclude,
        {as: 'checkins', model: db.models.tracking_state_task_checkin, separate: true},
      ],
    };

    logger.info('Querying DB for all tracking tasks without sequencing validated');

    let trackingStateTasks;
    try {
      trackingStateTasks = await db.models.tracking_state_task.findAll(opt);
    } catch (error) {
      logger.error(`Unable to search for tasks that are pending sequencing validation ${error}`);
      throw new Error({message: 'Unable to search for tasks that are pending sequencing validation', cause: error});
    }

    logger.info(`Found ${trackingStateTasks.length} cases requiring sequence validation`);
    this.sequencing_submit = trackingStateTasks;
    logger.debug(`Number of tasks attempting to start: ${trackingStateTasks.length}`);

    try {
      const checkTaskPromises = trackingStateTasks.map((task) => {
        return this.checkTaskSequenceValidation(task);
      });

      await Promise.all(checkTaskPromises);
    } catch (error) {
      logger.error(`Failed to process sequencing validated tasks ${error}`);
      throw new Error({message: 'Failed to process sequencing validated tasks', cause: error});
    }

    logger.info('Finished processing sequencing validated tasks');
  }

  /**
   * Lookup libraries in LIMS for sequencing validation entries
   *
   * @param {object} task - DB model object for a task
   * @returns {Promise.<undefined>} - Doesn't return anything
   */
  async checkTaskSequenceValidation(task) {
    if (!task) {
      logger.error('Empty task object passed to checkTaskSequenceValidation');
      throw new Error('Empty task object passed to checkTaskSequenceValidation');
    }

    const runStatus = {
      passed: true, // Single case false
      rejected: false, // single case true
    };

    // Setup Libraries for analysis
    // Invert keys & libraries. Doesn't matter which library hasn't started to fail task
    const libraries = _.invert(task.state.analysis.libraries);
    _.mapValues(libraries, () => false); // Set all libraries to false;

    let sequencerRun;
    // Lookup task's analysis libraries in LIMS illumina runs
    try {
      sequencerRun = await $lims.sequencerRun(Object.keys(libraries));
    } catch (error) {
      logger.error(`Failed to get LIMS sequencer run results: ${error}`);
      throw new Error({message: 'Failed to get LIMS Illumina run results', cause: error});
    }

    let passed = [];
    let rejected = [];

    // Check if the library has entries
    _.forEach(sequencerRun.results, (result) => {
      if (result.approval === 'Approved') {
        passed = passed.concat(_.intersection(Object.keys(libraries), result.multiplexLibraryNames)); // Check in pooled libraries
        passed = passed.concat(_.intersection(Object.keys(libraries), [result.libraryName])); // Check for non-pooled libraries (normal)
      }

      // Failed run, collect the problem libraries
      if (result.approval === 'Rejected') {
        rejected = rejected.concat(_.intersection(Object.keys(libraries), result.multiplexLibraryNames)); // Check in pooled libraries
        rejected = rejected.concat(_.intersection(Object.keys(libraries), [result.libraryName])); // Check for non-pooled libraries (normal)
        runStatus.rejected = true;
      }
    });

    // Filter uniques
    passed = _.uniq(passed);
    rejected = _.uniq(rejected);

    logger.debug(`Found ${passed.length} libraries that have passed validation for: ${task.state.analysis.pog.POGID}`);

    // Loop over all libraries and check to see if they're in the complete array
    _.forEach(Object.keys(libraries), (library) => {
      if (!passed.includes(library)) {
        runStatus.passed = false;
      } else {
        libraries[library] = true;
      }
    });

    // Check to see if a rejected entry has since been passed
    if (_.difference(rejected, passed).length === 0) {
      runStatus.rejected = false;
    }

    const actionTask = new Task(task);

    // One or more libraries failed?
    if (runStatus.rejected) {
      // Set Task Status to Failed
      actionTask.setUnprotected({status: 'failed'});
      try {
        await actionTask.instance.save();
        logger.warn(`[SeqValid] LIMS responded with failed library for: ${task.state.analysis.pog.POGID}`);
        return;
      } catch (error) {
        logger.error(`[SeqValid] Unable to update task as failed for: ${task.state.analysis.pog.POGID}`);
      }
    }

    // If they're all complete, lets blow this popsicle joint!
    if (runStatus.passed && !runStatus.failed) {
      try {
        await actionTask.checkIn(this.user, true, false, true);
        logger.info(`[SeqValid] Checked-in task for: ${task.state.analysis.pog.POGID}`);
        return;
      } catch (error) {
        logger.error(`[SeqValid] Failed to check in completed task for ${task.state.analysis.pog.POGID}: ${error.message}`);
        return;
      }
    }

    if (!runStatus.passed && !runStatus.failed) {
      logger.info(`[SeqValid] Sequence validation still pending for: ${task.state.analysis.pog.POGID}`);
    }
  }

  /**
   * Get list of tasks that need sequencing validation results
   *
   * @returns {Promise.<undefined>} - Doesn't return anything
   */
  async getTasksPendingSequenceQC0() {
    const opt = {
      where: {
        slug: 'sequencing_qc0',
        status: {$not: 'complete'},
        deletedAt: null,
        '$state.status$': {
          $in: [
            'active',
          ],
        },
      },
      attributes: {
        include: ['state_id'],
      },
      include: [
        {as: 'state', model: db.models.tracking_state.scope('noTasks')},
      ],
    };

    logger.info('Querying DB for all tracking tasks without sequencing QC0');

    let trackingStateTasks;
    try {
      trackingStateTasks = await db.models.tracking_state_task.scope('public').findAll(opt);
    } catch (error) {
      logger.error(`Unable to search for tasks that are pending sequencing QC0 ${error}`);
      throw new Error({message: 'Unable to search for tasks that are pending sequencing QC0', cause: error});
    }

    logger.info(`Found ${trackingStateTasks.length} cases requiring sequence QC0`);
    this.sequencing_submit = trackingStateTasks;
    logger.debug(`Number of tasks attempting to start: ${trackingStateTasks.length}`);

    try {
      const taskCheckPromises = trackingStateTasks.map((task) => {
        return this.checkTaskSequenceQC0(task);
      });

      await Promise.all(taskCheckPromises);
    } catch (error) {
      logger.error(`Failed to process sequencing QC0 tasks ${error}`);
      throw new Error({message: 'Failed to process sequencing QC0 tasks', cause: error});
    }
  }

  /**
   * Lookup libraries in LIMS for sequencing QC0 entries
   *
   * @param {object} task - DB model object for a task
   * @returns {Promise.<undefined>} - Doesn't return anything
   */
  async checkTaskSequenceQC0(task) {
    if (!task) {
      logger.error('Empty task object passed to checkTaskSequenceQC0');
      throw new Error('Empty task object passed to checkTaskSequenceQC0');
    }

    const runStatus = {
      passed: true, // Single case false
      failed: false, // single case true
    };

    // Setup Libraries for analysis
    // Invert keys & libraries. Doesn't matter which library hasn't started to fail task
    const libraries = _.invert(task.state.analysis.libraries);
    _.mapValues(libraries, () => false); // Set all libraries to false;

    let sequencerRun;
    try {
      // Lookup task's analysis libraries in LIMS illumina runs
      sequencerRun = await $lims.sequencerRun(Object.keys(libraries));
    } catch (error) {
      logger.error(`Failed to get LIMS sequencer run results: ${error.message}`);
      throw new Error({message: 'Failed to get LIMS sequencer run results', cause: error});
    }

    let passed = [];
    let failed = [];

    // Check if the library has entries
    _.forEach(sequencerRun.results, (result) => {
      if (result.qcStatus === 'Passed') {
        passed = passed.concat(_.intersection(Object.keys(libraries), result.multiplexLibraryNames)); // Check in pooled libraries
        passed = passed.concat(_.intersection(Object.keys(libraries), [result.libraryName])); // Check for non-pooled libraries (normal)
      }

      // Failed run, collect the problem libraries
      if (result.qcStatus === 'Failed') {
        failed = failed.concat(_.intersection(Object.keys(libraries), result.multiplexLibraryNames)); // Check in pooled libraries
        failed = failed.concat(_.intersection(Object.keys(libraries), [result.libraryName])); // Check for non-pooled libraries (normal)
        runStatus.failed = true;
      }
    });

    // Filter uniques
    passed = _.uniq(passed);
    failed = _.uniq(failed);

    logger.debug(`Found ${passed.length} libraries that have passed QC0 for: ${task.state.analysis.pog.POGID}`);

    // Loop over all libraries and check to see if they're in the complete array
    _.forEach(Object.keys(libraries), (library) => {
      if (!passed.includes(library)) {
        runStatus.passed = false;
      } else {
        libraries[library] = true;
      }
    });

    // Check to see if a rejected entry has since been passed
    if (_.difference(failed, passed).length === 0) {
      runStatus.failed = false;
    }

    const actionTask = new Task(task);

    // One or more libraries failed?
    if (runStatus.failed) {
      // Set Task Status to Failed
      actionTask.setUnprotected({status: 'failed'});

      try {
        await actionTask.instance.save();
        logger.warn(`[SeqQC0] LIMS responded with failed library for: ${task.state.analysis.pog.POGID}`);
        return;
      } catch (error) {
        logger.error(`[SeqQC0] Unable to update task as failed for: ${task.state.analysis.pog.POGID}`);
        throw new Error({message: '[SeqQC0] Unable to update task as failed', cause: error});
      }
    }

    // If they're all complete, lets blow this popsicle joint!
    if (runStatus.passed && !runStatus.failed) {
      try {
        await actionTask.checkIn(this.user, true, false, true);
        logger.info(`[SeqQC0] Checked-in task for: ${task.state.analysis.pog.POGID}`);
        return;
      } catch (error) {
        logger.error(`[SeqQC0] Failed to check in completed task for ${task.state.analysis.pog.POGID}: ${error.message}`);
        return;
      }
    }

    if (!runStatus.passed && !runStatus.failed) {
      logger.info(`[SeqQC0] QC0 still pending for: ${task.state.analysis.pog.POGID}`);
    }
  }

  /**
   * Get and save Syncro User
   *
   * @returns {Promise.<object>} - Returns Syncro user
   * @private
   */
  async _getSyncUser() {
    let user;
    try {
      user = await db.models.user.findOne({where: {username: 'synchro'}});
    } catch (error) {
      logger.error(`Error while trying to find Syncro user ${error}`);
      throw new Error({message: 'Error while trying to find Syncro user', cause: error});
    }

    if (!user) {
      logger.error('Unable to get Syncro user');
      throw new Error('Unable to get Syncro user');
    }

    this.user = user;
    return this.user;
  }
}

module.exports = LimsSeqSync;
