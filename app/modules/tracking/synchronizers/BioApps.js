const _ = require('lodash');
const db = require('../../../models');
const $bioapps = require('../../../api/bioapps');
const Task = require('../task');

const logger = require('../../../../lib/log');

logger.info('Starting BioApps Sync');

class BioAppsSync {
  /**
   * BioApps Sync
   *
   * @param {object} options - Options for BioAppsSync
   * @property {boolean} dryrun - Whether this sync is a dryrun
   * @property {Array.<string>} pogids - POGIDs that need to be checked for Path passed
   * @property {object} pog_analyses - Analyses being tracked
   * @property {object} pogs - Processed POGs from LIMS
   * @property {Array.<string>} diseaseLibraries - Libraries that need resolution from LIMS Library API
   * @property {object} user - Sync user
   * @property {object} cache - Cached tasks
   */
  constructor(options = {}) {
    this.dryrun = options.dryrun || false;
    this.pogids = [];
    this.pog_analyses = {};
    this.pogs = {};
    this.diseaseLibraries = [];
    this.user = null;
    this.cache = {tasks: []};
  }

  /**
   * Initialize syncronization task
   *
   * @returns {Promise.<object>} - Returns checked-in tasks
   */
  async init() {
    try {
      await $bioapps.login(); // 00. Fresh session with BioApps API
      await this._getSyncUser(); // 01. Get the Sync user account
      const tasksBioApps = await this.getBioAppsSyncRequired(); // 02. Get Tasks Requiring BioApps Sync
      const bioAppsPatient = await this.queryBioAppsPatient(tasksBioApps); // 03. Query BioApps Patient Details (Biop)
      await this.parseBioAppsPatient(bioAppsPatient); // 04. Parse BioApps Patient Details (Biop#)
      const tasksBam = await this.getMergedBamsRequired(); // 05. Get Tasks Pending Merged BAMs required
      const mergedBams = await this.queryMergedBams(tasksBam); // 06. Query BioApps to get Merged BAMs available // GET http://bioappsdev01.bcgsc.ca:8104/merge?library=P01234,P01235,P01236
      await this.parseMergedBams(mergedBams); // 07. Parse response from BioApps and update tracking
      const tasksAssembly = await this.getAssemblyCompleteRequired(); // 08. Get tasks with assembly required pending
      const assemblyComplete = await this.queryAssemblyComplete(tasksAssembly); // 09. Query BioApps to see which have completed assembly // GET http://bioappsdev01.bcgsc.ca:8104/assembly?library=P02511
      await this.parseAssemblyComplete(assemblyComplete); // 10. Parse response from BioApps and update tracking
      const tasksSymlinks = await this.getSymlinksRequired(); // 11. Get tasks with Symlink required pending  //
      const symLinks = await this.querySymlinksCreated(tasksSymlinks); // 12. Query BioApps to see which tasks have completed symlink creation (check if aligned libcore has file_path and is successful)
      const result = await this.parseSymlinksCreated(symLinks); // 13. Parse response from BioApps and update tracking

      logger.info('Finished processing BioApps syncing');
      this._reset();
      return {summary: 'Finished running BioApps check', result};
    } catch (error) {
      logger.error(`Failed to complete BioApps sync: ${error.message}`);
      this._reset();
      throw new Error(`Failed to complete all tasks in BioApps sync: ${error}`);
    }
  }

  /**
   * Get all tasks that need to sync patient data
   *
   * @returns {Promise.<Array.<object>>} - Returns tasks that need to sync patient data
   */
  async getBioAppsSyncRequired() {
    const opt = {
      where: {
        slug: 'bioapps_patient_sync',
        deletedAt: null,
        status: ['pending', 'failed'],
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

    logger.info('Querying DB for all tracking tasks requiring patient syncing');

    try {
      const tasks = await db.models.tracking_state_task.scope('public').findAll(opt);
      logger.info(`Tasks requiring bioapps data sync ${tasks.length}`);
      this.cache.tasks.patients = tasks;
      return tasks;
    } catch (error) {
      logger.error(`Unable to retrieve tasks requiring patient syncing ${error}`);
      throw new Error(`Unable to retrieve tasks requiring patient syncing ${error}`);
    }
  }

  /**
   * Query BioApps Patient Data
   *
   * @param {array} tasks - Collection of tasks that need patient info syncing
   * @returns {Promise.<Array.<object>>} - Returns patient info synced tasks
   */
  async queryBioAppsPatient(tasks) {
    try {
      const promises = tasks.map((task) => {
        return $bioapps.patient(task.state.analysis.pog.POGID);
      });
      const responses = await Promise.all(promises);
      return responses;
    } catch (error) {
      logger.error(`Failed to query BioApps for patient data ${error}`);
      throw new Error(`Failed to query BioApps for patient data ${error}`);
    }
  }

  /**
   * Process patient data from BioApps and save in IPR
   *
   * @param {array} patients - Collection of results from BioApps
   * @returns {undefined}
   */
  async parseBioAppsPatient(patients) {
    // Create POGID Map
    const pogs = {};
    const queries = [];

    logger.debug(`Patients to be sync'd: ${patients.length}`);

    // Create POGID => Task map
    this.cache.tasks.patients.forEach((patient) => {
      pogs[patient.state.analysis.pog.POGID] = patient;
    });

    // Loop over patient results and prep payloads
    patients.forEach((patient) => {
      if (patient.length === 0) {
        return;
      }

      patient = patient[0]; // Remove array wrapper

      let task = null;
      let source = null;
      let sourceAnalysisSetting = null;
      const update = {data: {comparator_disease: {}, comparator_normal: {}}, where: {}};

      // Try to extract the POGID from this patient result and use it to pull the corresponding task entry
      try {
        task = pogs[patient.sources[0].participant_study_identifier];
      } catch (error) {
        logger.warn(`Unable to extract patient data for: ${patient} error: ${error}`);
        return; // Skip this row
      }

      // Workaround, would rather sort by createdAt
      patient.sources = _.sortBy(patient.sources, 'id');

      // Pick the sources we're looking for.
      _.forEach(patient.sources, (s) => {
        const search = _.find(s.libraries, {name: task.state.analysis.libraries.tumour});

        if (search) {
          source = s;
        }
      });

      // Check if source was found. If not, move to next entry.
      if (!source) {
        logger.error(`Unable to find source for ${patient.sources[0].participant_study_identifier}`);
        return;
      }

      if (source.source_analysis_settings.length === 0) {
        return;
      }


      try {
        source.source_analysis_settings = _.sortBy(source.source_analysis_settings, 'data_version');
        sourceAnalysisSetting = _.last(source.source_analysis_settings);

        // With a source Found, time to build the update for this case;
        update.data.analysis_biopsy = 'biop'.concat(sourceAnalysisSetting.biopsy_number);
        update.data.bioapps_source_id = source.id;
        update.data.biopsy_site = source.anatomic_site;

        // Three Letter Code
        update.data.threeLetterCode = sourceAnalysisSetting.cancer_group.code;
      } catch (error) {
        logger.error(`BioApps source analysis settings missing required details: ${error.message}`);
        return;
      }

      const parsedSettings = $bioapps.parseSourceSettings(source);

      // Compile Disease Comparator
      update.data.comparator_disease = {
        analysis: parsedSettings.disease_comparator_analysis,
        all: parsedSettings.disease_comparators,
        tumour_type_report: parsedSettings.tumour_type_report,
        tumour_type_kb: parsedSettings.tumour_type_kb,
      };

      update.data.comparator_normal = {
        normal_primary: parsedSettings.normal_primary,
        normal_biopsy: parsedSettings.normal_biopsy,
        gtex_primary: parsedSettings.gtex_primary,
        gtex_biopsy: parsedSettings.gtex_biopsy,
      };

      // Set update where clause.
      update.where = {ident: task.state.analysis.ident};

      update.task = task;

      queries.push(update);

      logger.info(`Syncing patient info for ${source.participant_study_identifier} (${task.state.analysis.clinical_biopsy})`);
    });

    // Update Tables first
    try {
      const updatedPogAnalysis = queries.map((query) => {
        return db.models.pog_analysis.update(query.data, {where: query.where});
      });
      await Promise.all(updatedPogAnalysis);
    } catch (error) {
      logger.error(`Failed to update analysis table following BioApps patient sync ${error}`);
      process.exit();
      throw new Error(`Failed to update analysis table following BioApps patient sync ${error}`);
    }

    try {
      const checkedInTasks = queries.map((query) => {
        const task = new Task(query.task);
        return task.checkIn(this.user, true, false, true);
      });

      await Promise.all(checkedInTasks);
    } catch (error) {
      logger.error(`Failed to check-in tasks ${error}`);
      process.exit();
      throw new Error(`Failed to check-in tasks ${error}`);
    }
  }

  /**
   * Get all tasks that have not completed Merged BAMs
   *
   * @returns {Promise.<Array.<object>>} - Returns tracking state tasks that have not completed Merged BAMs
   */
  async getMergedBamsRequired() {
    const opt = {
      where: {
        slug: 'bioapps_merged_bams',
        deletedAt: null,
        status: ['pending', 'failed'],
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

    logger.info('Querying DB for all tracking tasks without Merged BAMs data');

    try {
      const tasks = await db.models.tracking_state_task.scope('public').findAll(opt);
      logger.info(`Tasks requiring merged bam lookup ${tasks.length}`);
      this.cache.tasks.mergedBams = tasks;
      return tasks;
    } catch (error) {
      logger.error(`Unable to retrieve pending merged bam tasks ${error}`);
      throw new Error(`Unable to retrieve pending merged bam tasks ${error}`);
    }
  }

  /**
   * Query BioApps Merged BAM endpoint
   *
   * @param {array} tasks - Collection of tasks that need merged BAM lookups performed
   * @returns {Promise.<Array.<object>>} - Returns BioApps merged BAM endpoints
   */
  async queryMergedBams(tasks) {
    try {
      const promises = tasks.map((task) => {
        return $bioapps.merge(Object.values(task.state.analysis.libraries).join(','));
      });

      const responses = await Promise.all(promises);
      return responses;
    } catch (error) {
      logger.error(`Failed to query BioApps for merged data ${error}`);
      throw new Error(`Failed to query BioApps for merged data ${error}`);
    }
  }

  /**
   * Process results from BioApps
   *
   * @param {array} results - Collection of results from BioApps
   * @returns {Promise.<Array.<object>>} - Returns checked-in complete tasks
   */
  async parseMergedBams(results) {
    const passedLibraries = {};

    // Loop over results from BioApps
    results.forEach((biopsy) => {
      // Extract all the library entries for each task
      _.forEach(biopsy, (library) => {
        if (library.success && library.status === 'production') {
          if (library.libraries === undefined) {
            logger.warn('#### Library key not detected for merge result: ', library.id);
            return;
          }

          passedLibraries[library.libraries[0].name] = library;
        }
      });
    });

    const completedTasks = [];

    // Loop over tasks, and check if it's completed
    _.forEach(this.cache.tasks.mergedBams, (task) => {
      // Check all three libraries
      if (_.intersection(Object.values(task.state.analysis.libraries), Object.keys(passedLibraries)).length >= 3) {
        completedTasks.push(task);
      }
    });

    // For each completed task, check-in!
    try {
      const promises = completedTasks.map((task) => {
        const newTask = new Task(task);
        return newTask.checkIn(this.user, true, false, true);
      });
      const checkedInCompletedTasks = await Promise.all(promises);
      logger.info(`Checked in merged bams for ${checkedInCompletedTasks.length} tasks`);
      return checkedInCompletedTasks;
    } catch (error) {
      logger.error(`Failed to check-in completed merged bams: ${error}`);
      throw new Error(`Failed to check-in completed merged bams: ${error}`);
    }
  }

  /**
   * Get all tasks that have not completed assembly
   *
   * @returns {Promise.<Array.<object>>} - Returns tasks requiring assembly lookup
   */
  async getAssemblyCompleteRequired() {
    const opt = {
      where: {
        slug: 'bioapps_assembly',
        deletedAt: null,
        status: ['pending', 'failed'],
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

    logger.info('Querying DB for all tracking tasks without completed assembly data');

    try {
      const tasks = await db.models.tracking_state_task.scope('public').findAll(opt);
      logger.info(`Tasks requiring assembly lookup ${tasks.length}`);
      this.cache.tasks.assembly = tasks;
      return tasks;
    } catch (error) {
      logger.error(`Unable to retrieve pending assembly tasks ${error}`);
      throw new Error(`Unable to retrieve pending assembly tasks ${error}`);
    }
  }

  /**
   * Query BioApps Assembly
   *
   * @param {array} tasks - Collection of tasks that need assembly lookups performed
   * @returns {Promise.<Array.<object>>} - Returns tasks assembly results
   */
  async queryAssemblyComplete(tasks) {
    try {
      const promises = tasks.map((task) => {
        return $bioapps.assembly(Object.values(task.state.analysis.libraries).join(','));
      });

      const assemblyResults = await Promise.all(promises);
      logger.info('Retrieved assembly results');

      return assemblyResults;
    } catch (error) {
      logger.error(`Failed to query BioApps ${error}`);
      throw new Error(`Failed to query BioApps ${error}`);
    }
  }

  /**
   * Process assembly results from BioApps
   *
   * @param {array} results - Collection of results from BioApps
   * @returns {Promise.<Array.<object>>} - Returns checked-in tasks
   */
  async parseAssemblyComplete(results) {
    const passedLibraries = {};

    // Loop over results from BioApps
    results.forEach((biopsy) => {
      // Extract all the library entries for each task
      biopsy.forEach((library) => {
        if (library.success) {
          passedLibraries[library.libraries[0].name] = library;
        }
      });
    });

    const completedTasks = [];

    // Loop over tasks, and check if it's completed
    this.cache.tasks.assembly.forEach((task) => {
      // Check all three libraries
      if (_.intersection(Object.values(task.state.analysis.libraries), Object.keys(passedLibraries)).length >= 2) {
        completedTasks.push(task);
      }
    });

    try {
      const promises = completedTasks.map((task) => {
        const newTask = new Task(task);
        return newTask.checkIn(this.user, true, false, true);
      });

      const checkedInTasks = await Promise.all(promises);
      logger.info(`Checked in assembly for ${checkedInTasks.length} tasks`);
      return checkedInTasks;
    } catch (error) {
      logger.error(`Failed to check in completed assembly ${error}`);
      throw new Error(`Failed to check in completed assembly ${error}`);
    }
  }

  /**
   * Get all tasks that require symlink checking
   *
   * @returns {Promise.<Array.<object>>} - Returns tasks that require symlink checking
   */
  async getSymlinksRequired() {
    const opt = {
      where: {
        slug: 'bioapps_symlinks_created',
        deletedAt: null,
        status: ['pending', 'active', 'failed'],
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

    logger.info('Querying DB for all tracking tasks with symlinks pending');

    try {
      const tasks = await db.models.tracking_state_task.scope('public').findAll(opt);
      logger.info(`Tasks requiring symlink lookup ${tasks.length}`);
      this.cache.tasks.symlinks = tasks;
      return tasks;
    } catch (error) {
      logger.error(`Unable to retrieve pending symlink tasks ${error}`);
      throw new Error(`Unable to retrieve pending symlink tasks ${error}`);
    }
  }

  /**
   * Get all tasks that require symlink checking
   *
   * @returns {Promise.<object>} - Returns unique libcores that have been aligned
   */
  async querySymlinksCreated() {
    // Get target number of lanes for all libraries
    const libcores = {};

    // Extract libraries
    let libs = this.cache.tasks.symlinks.map((task) => {
      return Object.values(task.state.analysis.libraries);
    });

    // Flatten nested arrays
    libs = _.flatten(libs);

    logger.info(`Starting query for retrieving library lane targets for ${libs.length} libraries`);

    // Query BioApps for Target number of lanes
    let queryResponse;
    try {
      queryResponse = await $bioapps.libraryAlignedCores(libs.join(','));
    } catch (error) {
      logger.error(`Failed to get target lanes & aligned libcore counts for BioApps ${error}`);
      throw new Error(`Failed to get target lanes & aligned libcore counts from BioApps ${error}`);
    }

    queryResponse.forEach((lib) => {
      if (!libcores[lib.libcore.library.name]) {
        libcores[lib.libcore.library.name] = [];
      }
      libcores[lib.libcore.library.name].push(lib);
    });

    return libcores;
  }

  /**
   * Parse Targets and Libcore values
   *
   * Determine if the target number of aligned libcores has been hit. If it has, we can infer that symlinks have
   * been created.
   *
   * @param {object} libcores - Hashmap of library names with arrays of aligned libcores
   *
   * @returns {Promise.<Array.<object>>} - Returns checked-in tasks
   */
  async parseSymlinksCreated(libcores) {
    const requireCheckin = [];

    // Loop over tasks, and determine which need checkins
    this.cache.tasks.symlinks.forEach((task) => {
      // Start with false assumption - attempt to prove.
      const targetReached = {
        normal: false,
        tumour: false,
        transcriptome: false,
      };

      // Function for checking all libcores have files & are successful
      const checkLibCoreComplete = (library) => {
        // Loop over cores and check their file & success
        for (const core of library) {
          if (!core.data_path || !core.successful) {
            return false;
          }
        }
        return true;
      };

      // Pull results for each library
      if (libcores[task.state.analysis.libraries.normal]) {
        targetReached.normal = checkLibCoreComplete(libcores[task.state.analysis.libraries.normal]); // Normal
      }
      if (libcores[task.state.analysis.libraries.tumour]) {
        targetReached.tumour = checkLibCoreComplete(libcores[task.state.analysis.libraries.tumour]); // Tumour
      }
      if (libcores[task.state.analysis.libraries.transcriptome]) {
        targetReached.transcriptome = checkLibCoreComplete(libcores[task.state.analysis.libraries.transcriptome]); // Transcriptome
      }

      // All goals reached?
      if (targetReached.normal && targetReached.tumour && targetReached.transcriptome) {
        requireCheckin.push(task);
      }
    });

    // Map checkins
    // For each completed task, check-in!
    try {
      const checkedInTasks = requireCheckin.map((checkInTask) => {
        const newTask = new Task(checkInTask);
        return newTask.checkIn(this.user, true, false, true);
      });

      const results = await Promise.all(checkedInTasks);
      logger.info(`Checked in symlinks for ${results.length} tasks`);
      return results;
    } catch (error) {
      logger.error(`Failed to check-in symlinks: ${error}`);
      throw new Error(`Failed to check-in symlinks: ${error}`);
    }
  }

  /**
   * Get and save Syncro User
   *
   * @returns {Promise.<object>} - Returns retrieved Syncro user
   * @private
   */
  async _getSyncUser() {
    let user;
    try {
      user = await db.models.user.findOne({where: {username: 'synchro'}});
    } catch (error) {
      logger.error(`Error while getting Syncro user ${error}`);
      throw new Error(`Error while getting Syncro user ${error}`);
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

module.exports = BioAppsSync;
