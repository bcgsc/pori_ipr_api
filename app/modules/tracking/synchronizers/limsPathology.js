const _ = require('lodash');
const moment = require('moment');
const db = require('../../../models');
const $lims = require('../../../api/lims');
const Task = require('../task');
const State = require('../state');

const logger = require('../../../../lib/log');

logger.info('Starting LIMS Sync');

class LimsPathologySync {
  /**
   * Lims Pathology Sync
   *
   * @param {object} options - Options for sync (i.e if dryrun or not)
   * @property {boolean} dryrun - Whether it is a dry run or not
   * @property {Array.<string>} pogids - POGIDs that need to be check for Path passed
   * @property {object} pog_analyses - Analyses being tracked
   * @property {object} pogs - Processed POGs from LIMS
   * @property {Array.<object>} diseaseLibraries - Libraries that need resolution from LIMS Library API
   * @property {object} user - Sync user
   */
  constructor(options = {}) {
    this.dryrun = options.dryrun || false;
    this.pogids = [];
    this.pog_analyses = {};
    this.pogs = {};
    this.diseaseLibraries = [];
    this.user = null;
  }

  /**
   * Initialize syncronization task
   *
   * @returns {Promise.<object>} - Returns results and a summary
   */
  async init() {
    await this.getTasksPendingPath();
    await this._getSyncUser();
    const limsSamples = await this.queryLimsSample();
    await this._parseLimsSampleResults(limsSamples);
    const limsLibs = await this.queryLimsLibrary();
    await this._parseLimsLibraryResults(limsLibs);
    await this.sortLibraryToBiopsy();
    await this.updateIprTracking();

    logger.info('Finished processing Pathology Passed LIMS sync.');
    this._reset();

    return {summary: 'Finished running pathology check.', result: true};
  }

  /**
   * Lookup tasks pending pathology results
   *
   * @returns {Promise.<Array.<string>>} - Returns the POGIDs of the tracking state tasks
   */
  async getTasksPendingPath() {
    const opt = {
      where: {
        slug: 'pathology_passed',
        deletedAt: null,
        status: 'pending',
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

    logger.info('Querying DB for all tracking tasks without pathology');

    let trackingStateTasks;
    try {
      trackingStateTasks = await db.models.tracking_state_task.scope('public').findAll(opt);
    } catch (error) {
      logger.error(`Unable to retrieve pending pathology tasks ${error}`);
      throw new Error({message: 'Unable to retrieve pathology tasks', cause: error.message});
    }

    const pogs = [];
    // Loop over results
    trackingStateTasks.forEach((task) => {

      const {POGID} = task.state.analysis.pog;
      pogs.push(POGID);

      if (!this.pog_analyses[POGID]) {
        this.pog_analyses[POGID] = [];
      }

      this.pog_analyses[POGID].push({
        ident: task.state.analysis.ident,
        clinical_biopsy: task.state.analysis.clinical_biopsy,
        analysis_biopsy: task.state.analysis.analysis_biopsy,
        disease: task.state.analysis.disease,
        biopsy_notes: task.state.analysis.biopsy_notes,
        libraries: task.state.analysis.libraries,
        createdAt: task.state.analysis.createdAt,
        task,
        pathDetected: false,
      });
    });

    logger.debug(`Found ${trackingStateTasks.length} tasks requiring lookup`);
    this.pogids = pogs;
    return this.pogids;
  }

  /**
   * Query LIMS biological metadata endpoint for POGs that have results
   *
   * @returns {Promise.<Array.<object>>} - Returns biological metadata for POGs
   */
  async queryLimsSample() {
    logger.info('Querying LIMS for biological metadata details for supplied POGs');

    let pogs;
    try {
      pogs = await $lims.biologicalMetadata(this.pogids);
    } catch (error) {
      logger.error(`Unable to retrieve LIMS biological metadata results for the provided pogs ${error}`);
      throw new Error({message: `Unable to retrieve LIMS biological metadata for the provided pogs: ${error.message}`, cause: error});
    }

    // If no results, send empty
    if (!pogs || !pogs.results) {
      return [];
    }

    logger.info(`Found ${pogs.results.length} results from LIMS biological metadata endpoint.`);

    // Get original source name and set libraries
    const originalSourceNames = pogs.results.map((result) => {
      result.libraries = [];
      return result.originalSourceName;
    });

    let libs;
    try {
      libs = await $lims.library(originalSourceNames);
    } catch (error) {
      logger.error(`Unable to get libraries by their original source name ${error}`);
      throw new Error({message: `Unable to get libraries by their original source name ${error}`, cause: error});
    }

    libs.results.forEach((lib) => {
      const foundPog = pogs.results.find((pog) => {
        return pog.originalSourceName === lib.originalSourceName;
      });
      foundPog.libraries.push(lib.name);
    });

    return pogs.results;
  }

  /**
   * Parse LIMS biological metadata endpoint results
   *
   * @param {array} pogs - LIMS biological metadata endpoint result collection
   * @returns {Promise.<object>} - Returns an object containing POGS for the sample
   * @private
   */
  async _parseLimsSampleResults(pogs) {
    logger.info('Starting to process sample results.');

    // If no results, continue
    if (!pogs || pogs.length === 0) {
      return [];
    }

    pogs.forEach((sample) => {
      const pogid = sample.participantStudyId;
      let datestamp;
      let firstCollectionTime;
      try {
        firstCollectionTime = sample.sampleCollectionTimes.find((time) => {
          return time !== null;
        });
        datestamp = (firstCollectionTime) ? firstCollectionTime.substring(0, 10) : moment().format('YYYY-MM-DD');
      } catch (error) {
        logger.error(`Error while trying to get collection time POG: ${pogid} Error: ${error}`);
        throw new Error({message: 'Error while trying to get collection time', cause: error});
      }

      sample.libraries.forEach((lib) => {
        const library = {
          name: lib,
          type: (sample.diseaseStatus === 'Normal') ? 'normal' : null,
          source: sample.originalSourceName,
          disease: sample.diseaseName,
          sampleCollectionTime: firstCollectionTime,
        };

        if (sample.diseaseStatus === 'Diseased' && !this.diseaseLibraries.includes(lib)) {
          this.diseaseLibraries.push(lib);
        }

        // Check if pog has been seen yet in this cycle
        if (!this.pogs[pogid]) {
          this.pogs[pogid] = {};
        }

        // Check if this biopsy event date
        if (!this.pogs[pogid][datestamp]) {
          this.pogs[pogid][datestamp] = [];
        }

        // Has this library name been listed yet?
        if (!_.find(this.pogs[pogid][datestamp], {name: library.name})) {
          this.pogs[pogid][datestamp].push(library);
          logger.debug(`Setting ${library.name} for ${pogid} biopsy ${datestamp}${((library.type !== null) ? ` | library type detected: ${library.type}` : '')}`);
        }
      });
    });

    logger.info(`Resulting in ${this.diseaseLibraries.length} disease libraries that have pathology information and need additional library details to differentiate RNA vs DNA.`);

    return this.pogs;
  }

  /**
   * Query the LIMS Library API
   *
   * Resolve library details to determine RNA from DNA libs
   *
   * @returns {Promise.<Array.<object>>} - Returns all diseased libraries from LIMS API
   */
  async queryLimsLibrary() {
    if (this.diseaseLibraries.length === 0) {
      logger.info('Zero disease libraries requiring lookup');
      return [];
    }

    try {
      const diseasedLibraries = await $lims.library(this.diseaseLibraries, 'name');
      logger.info(`Received ${diseasedLibraries.results.length} libraries from LIMS library endpoint.`);

      return diseasedLibraries.results;
    } catch (error) {
      logger.error(`Unable to query LIMS library API endpoint: ${error.message}`);
      throw new Error({message: `Unable to query LIMS library API endpoint: ${error.message}`, cause: error});
    }
  }

  /**
   * Parse Library results into master collection
   *
   * Differentiate RNA from DNA libraries, and sort into POG object
   *
   * @param {array} libraries - Array of libraries found by LIMS library API
   * @returns {Promise.<undefined>} - No return value
   * @private
   */
  async _parseLimsLibraryResults(libraries) {
    libraries.forEach((library) => {

      // Grab associated POG biopsies
      const [pogName] = library.originalSourceName.split('-');
      const pog = this.pogs[pogName];

      // Loop over biopsies
      _.forEach(pog, (libs, biopsyDate) => {

        // The index key of the library we're looking for
        const index = _.findKey(libs, {name: library.name});

        if (!index) {
          return;
        }

        logger.debug(`Found mapped POG biopsy entry for ${library.name} in position ${index} in biopsy ${biopsyDate} for ${pogName}`);

        // Libraries are all diseased so don't worry about normal
        if (library.nucleicAcidType === 'DNA') {
          this.pogs[pogName][biopsyDate][index].type = 'tumour';
        }
        if (library.nucleicAcidType === 'RNA') {
          this.pogs[pogName][biopsyDate][index].type = 'transcriptome';
        }
      });
    });
    logger.info('Finished receiving library details.');
  }

  /**
   * Detect biopsy events
   *
   * @returns {Promise.<undefined>} - No return value
   */
  async sortLibraryToBiopsy() {
    // Loop over LIMS entries results
    _.forEach(this.pogs, (limsBiops, pogid) => {
      // Are there any Tracking Entries waiting?
      const tracking = this.pog_analyses[pogid];

      // Are there any biopsies waiting?
      if (Object.keys(tracking).length > 0) {
        // Loop over tracking analysis to see if there's a matching biopsy window by then looping over LIMS entries
        _.forEach(tracking, (tracking_analysis, track_i) => {

          // Loop over the found LIMS biopsy sorted libraries
          _.forEach(limsBiops, (limsLibs, lims_biopsy_date) => {

            // Find the libraries for each type
            let normal = _.find(limsLibs, {type: 'normal'});
            const tumour = _.find(limsLibs, {type: 'tumour'});
            const transcriptome = _.find(limsLibs, {type: 'transcriptome'});

            // Check for other normals if one is not in this biopsy date.
            if (!normal) {
              // Loop over all biopsies
              _.forEach(limsBiops, (biop) => {
                // If already set, continue.
                if (normal) {
                  return;
                }
                // Find a normal
                normal = _.find(biop, {type: 'normal'});
              });
            }

            // Make sure there are 3 libraries ready to go.
            if (!normal || !tumour || !transcriptome) {
              return;
            }

            this.pog_analyses[pogid][track_i].libraries = {};

            if (normal) {
              this.pog_analyses[pogid][track_i].libraries.normal = normal.name;
              logger.info(`Set normal library ${normal.name} for ${pogid} (${this.pog_analyses[pogid][track_i].clinical_biopsy})`);
            }
            if (tumour) {
              this.pog_analyses[pogid][track_i].libraries.tumour = tumour.name;
              logger.info(`Set tumour library ${tumour.name} for ${pogid} (${this.pog_analyses[pogid][track_i].clinical_biopsy})`);
            }
            if (transcriptome) {
              this.pog_analyses[pogid][track_i].libraries.transcriptome = transcriptome.name;
              logger.info(`Set transcriptome library ${transcriptome.name} for ${pogid} (${this.pog_analyses[pogid][track_i].clinical_biopsy})`);
            }

            // Update Entries
            this.pog_analyses[pogid][track_i].disease = tumour.disease.trim();
            this.pog_analyses[pogid][track_i].pathDetected = true;
            this.pog_analyses[pogid][track_i].status = 'complete';
          });
        });
      }
    });
  }

  /**
   * Update IPR tracking with LIMs results
   *
   * Parse updated POG libraries into IPR data, and update tracking
   *
   * @returns {Promise.<undefined>} - No return value
   */
  async updateIprTracking() {
    const states = [];
    const reportOpts = [];

    // Loop over pog analyses
    _.forEach(this.pog_analyses, (analyses, pogid) => {
      // Loop over each analysis
      _.forEach(analyses, (analysis) => {
        if (!analysis.pathDetected) {
          logger.info(`Pathology not detected for ${pogid} (${analysis.clinical_biopsy})`);
          return;
        }

        // add State IDs to array
        states.push(analysis.task.state.id);

        // Update Analysis
        const opts = {
          where: {
            ident: analysis.ident,
          },
        };

        const data = {
          libraries: analysis.libraries,
          disease: analysis.disease,
        };

        // Add future analysis_report updates
        reportOpts.push({opts, data});
      });
    });

    let tasks;
    try {
      // Get all the tasks that need to be updated
      tasks = await this.retrieveTrackingTasks(states);
    } catch (error) {
      logger.error(`Failed to retrieve tasks for updating tracking: ${error.message}`);
      throw new Error({message: error.message});
    }

    if (!tasks) {
      logger.error('Unable to retrieve tracking tasks');
      throw new Error('Unable to retrieve tracking tasks');
    }

    try {
      const taskPromises = tasks.map((task) => {
        const newTask = new Task(task);
        return newTask.checkIn(this.user, moment().toISOString());
      });

      await Promise.all(taskPromises);
    } catch (error) {
      logger.error(`Error while checking in new tasks ${error}`);
      throw new Error({message: 'Error while checking in new tasks', cause: error});
    }

    // Get set of states that had tasks updated
    const checkStatesForCompletion = _.uniqBy(tasks.map(task => task.state), 'state_id');
    logger.debug(`Checking ${checkStatesForCompletion.length} state(s) for completion`);

    try {
      // Check if states are complete
      const statePromises = checkStatesForCompletion.map((state) => {
        const newState = new State(state);
        return newState.checkCompleted();
      });

      await Promise.all(statePromises);
    } catch (error) {
      logger.error(`Error while trying to check if states are completed ${error}`);
      throw new Error({message: 'Error while trying to check if states are completed', cause: error});
    }

    try {
      // Update fields in analysis
      const reportOptsPromises = reportOpts.map((report) => {
        return db.models.pog_analysis.update(report.data, report.opts);
      });

      await Promise.all(reportOptsPromises);
    } catch (error) {
      logger.error(`Error while trying to update fields in analysis ${error}`);
      throw new Error({message: 'Error while trying to update fields in analysis', cause: error});
    }

    logger.info('Checked in all ready tasks');
  }

  /**
   * Retrieve Tracking Tasks
   *
   * @param {Array.<number>} stateIds - State id for tracking tasks
   * @return {Promise.<Array.<object>>} - Returns tracking tasks
   */
  async retrieveTrackingTasks(stateIds) {
    logger.debug(`Retrieving tasks for states: ${stateIds.join(',')}`);

    const opts = {
      where: {
        slug: {
          $in: [
            'tumour_received',
            'blood_received',
            'pathology_passed',
          ],
        },
        state_id: {$in: stateIds},
      },
      include: [
        {as: 'state', model: db.models.tracking_state},
        {as: 'checkins', model: db.models.tracking_state_task_checkin},
      ],
    };

    try {
      const tasks = await db.models.tracking_state_task.findAll(opts);
      return tasks;
    } catch (error) {
      logger.error(`Failed to retrieve all tracking tasks for this state: ${stateIds}`);
      throw new Error({message: 'Failed to retrieve all tracking tasks for this state.', cause: error});
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
      throw new Error({message: `Error while trying to find Syncro user ${error}`, cause: error});
    }

    if (!user) {
      logger.error('Unable to get Syncro user');
      throw new Error('Unable to get Syncro user');
    }

    this.user = user;
    return this.user;
  }

  /**
   * Reset Library
   *
   * @property {Array.<string>} pogids - POGIDs that need to be check for Path passed
   * @property {object} pog_analyses - Analyses being tracked
   * @property {object} pogs - Processed POGs from LIMS
   * @property {Array.<object>} diseasedLibraries - Libraries that need resolution from LIMS Library API
   * @property {object} user - Sync User
   *
   * @returns {undefined}
   * @private
   */
  _reset() {
    this.pogids = [];
    this.pog_analyses = {};
    this.pogs = {};
    this.diseaseLibraries = [];
    this.user = null;
  }
}

module.exports = LimsPathologySync;
