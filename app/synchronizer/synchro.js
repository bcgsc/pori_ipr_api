/*
 IPR-API - Integrated Pipeline Reports API

 COPYRIGHT 2016 MICHAEL SMITH GENOME SCIENCES CENTRE
 CONFIDENTIAL -- FOR RESEARCH PURPOSES ONLY

 Author: Brandon Pierce <bpierce@bcgsc.ca>
 Support JIRA ticket space: DEVSU

 This Node.JS script is designed to be run in ES6 compliant mode

 Description
 The synchronization main class. Iterates over itself, invoking registered hooks when they are determined to be stale.

*/

const uuidv4 = require('uuid/v4');
const moment = require('moment');
const _ = require('lodash');

const logger = require('../log');

/**
 * Synchronizer base class
 *
 * Allows sync hooks to be registered and called on a specified schedule
 *
 */

class Synchro {
  /**
   * Constructor
   *
   * @param {integer} interval - Interval in seconds
   * @param {string} mode - The operation mode
   * @property {object} hooks - Hooks registry { uuid: {name: str, frequency: int, fn: fn() } }
   * @property {object} hookMap - Map of hook UUIDs to Names - used to prevent naming collisions { name: uuid, ... }
   * @property {string} runMode - Run mode for the synchronizer. Default is dryrun
   * @property {object} invocationRegistry - Time since last invocation for each hook { uuid: {time: int, result: str/text} }
   * @property {number} interval - Default iteration time
   */
  constructor(interval = null, mode = null) {
    this.hooks = {};
    this.hookMap = {};
    this.runMode = mode || 'dryrun';
    this.invocationRegistry = {};
    this.interval = (interval * 1000) || 1000;

    logger.info(`Syncro set up to run every ${this.interval / 1000}s`);
  }

  /**
   * Start the synchronizer
   *
   * Never-ending loop; Invokes hooks if they become stale
   * @returns {undefined}
   */
  start() {
    let round = 0;

    setInterval(() => {
      logger.debug(`Starting round ${round}`);

      // Loop over registered hooks
      Object.keys(this.hooks).forEach((uuid) => {
        if (this._checkHook(uuid)) {
          this._invokeHook(uuid);
        }
      });

      round++;
    }, this.interval);
    // ♪ I'm going to live forever ♪
  }

  /**
   * Register a synchronization hook
   *
   * Takes in a name, frequency, and callback function to be invoked
   *
   * @param {string} name - Name of hook to register
   * @param {number} frequency - Number of seconds between iterations
   * @param {object} obj - The obj with init function
   *
   * @returns {object} - Returns the UUID
   */
  registerHook(name, frequency, obj) {
    const uuid = uuidv4();

    this.hooks[uuid] = {
      obj,
      name,
      frequency,
    };

    this.hookMap[name] = uuid;
    logger.info(`Hook registered: ${this.hooks[uuid].name} on index ${uuid}. It will run every ${frequency} seconds.`);

    return this.hooks[uuid];
  }

  /**
   * Check if a hook is stale
   *
   * Check to see if a hook is stale, and needs to be executed.
   *
   * @private
   * @synchronous
   *
   * @param {string} uuid - UUID of task to be checked for stale and invocation history
   *
   * @returns {boolean} - Returns a bool on whether the task is stale or not
   */
  _checkHook(uuid) {
    // Retrieve invocation history for this uuid
    const history = this.invocationRegistry[uuid];

    // Check that there's an invocation history
    if (!history || history.length === 0) {
      logger.debug(`No history yet for this hook: ${uuid}`);
      return true;
    }

    // Check if stale
    if (history.length > 0 && moment().unix() - _.last(history).end > this.hooks[uuid].frequency) {
      logger.debug(`Hook is stale: ${uuid}`);
      // Hook is stale, invoke it!
      return true;
    }

    logger.debug(`Hook has history and is not stale: ${uuid}`);

    // Hook is not stale
    return false;
  }

  /**
   * Invoke Hook
   *
   * Takes in a hook UUID and invokes the associated function. Performs some basic hook invocation collision checking,
   * but will not check for stale vs not stale. Simply will not allow concurrent task execution.
   *
   * @param {string} uuid - UUID of hook to be invoked
   * @returns {Promise.<boolean>} - Returns whether the hook is invoked
   *
   */
  async _invokeHook(uuid) {
    if (this.runMode === 'dryRun') {
      logger.info(`[DRYRUN] Not invoking: ${this.hooks[uuid].name}`);
      return false;
    }

    logger.info('Invoking hook', uuid);

    // Create invocation entry array
    if (!this.invocationRegistry[uuid]) {
      this.invocationRegistry[uuid] = [];
    }

    // Get Hook
    const hook = this.hooks[uuid];

    // Check if there are any currently running?
    if (_.find(this.invocationRegistry[uuid], {status: 'running'})) {
      logger.warn(`Hook ${hook.name} is still running the last invocation`);
      return true;
    }

    // Create entry for invocation
    this.invocationRegistry[uuid].push({
      start: moment().unix(),
      end: null,
      result: null,
      status: 'running',
    });

    // Get run index for logging result
    const runIndex = this.invocationRegistry[uuid].length - 1;

    try {
      const result = await hook.obj.init();
      this.invocationRegistry[uuid][runIndex].status = 'success';
      this.invocationRegistry[uuid][runIndex].result = result.summary;
      this.invocationRegistry[uuid][runIndex].end = moment().unix();
      return true;
    } catch (error) {
      this.invocationRegistry[uuid][runIndex].status = 'failed';
      this.invocationRegistry[uuid][runIndex].result = error.message;
      this.invocationRegistry[uuid][runIndex].end = moment().unix();
      console.error(error);
      return false;
    }
  }
}

module.exports = Synchro;
