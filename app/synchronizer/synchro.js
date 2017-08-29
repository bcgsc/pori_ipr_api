"use strict";

const uuidv4        = require('uuid/v4');
const moment        = require('moment');
const db            = require(process.cwd() + '/app/models');
const _             = require('lodash');
const logger        = process.logger;

/**
 * Synchronizer base class
 *
 * Allows sync hooks to be registered and called on a specified schedule
 *
 */

class Synchro {
  
  constructor(interval=null, mode=null) {
    
    this.hooks = {};                  // Hooks registry { uuid: {name: str, frequency: int, fn: fn() } }
    this.hookMap = {};                // Map of hook UUIDs to Names - used to prevent naming collisions { name: uuid, ... }
    this.runMode = mode || 'dryrun';  // Run mode for the synchronizer. Default is dryrun
    this.invocationRegistry = {};     // Time since last invocation for each hook { uuid: {time: int, result: str/text} }
    this.interval = interval || 1000; // Default iteration time
  }
  
  /**
   * Start the synchronizer
   *
   * Recursive loop to wait for hook events to be invoked
   *
   */
  start() {
    
    let round = 0;
    
    setInterval(() => {
      
      let promises = [];
      
      // Loop over registered hooks
      _.forEach(this.hooks, (hook, uuid) => {
        
        promises.push(this._checkHook(uuid));
        
      });
      
      Promise.all(promises).then(
        (result) => {
          logger.info('Invocation', round, ' | Waiting another ' + this.interval + 's');
        }
      ).catch((err) => {
        console.log('There was a problem with the hook processing', err);
      });
      
      
      round++;
      
      
      
    }, this.interval);
    
  }
  
  /**
   * Register a syncronization hook
   *
   * Takes in a name, frequency, and callback function to be invoked
   *
   * @param {string} name - Name of hook to register
   * @param {number} frequency - Number of sections between iterations
   * @param {object} obj - The obj with init function
   *
   * @returns {object} - Returns the UUID
   */
  registerHook(name, frequency, obj) {
    
    let uuid = uuidv4();
    
    this.hooks[uuid] = {
      obj: obj,
      name: name,
      frequency: frequency
    };
    
    this.hookMap[name] = uuid;
    
    logger.info('Hook registered: ', this.hooks[uuid].name, uuid);
    
    return this.hooks[uuid];
  }
  
  /**
   * Get Hooks
   *
   * Return the list of registered hooks, and their details
   *
   */
  getHooks() {
  
  }
  
  /**
   * Check if a hook is stale
   *
   * Check to see if a hook is stale, and needs to be executed.
   *
   * @param uuid
   * @synchronous
   * @private
   */
  _checkHook(uuid) {
    
    return new Promise((resolve, reject) => {
      
      // Retrieve invocation history for this uuid
      let history = this.invocationRegistry[uuid];
      
      // Check that there's an invocation history
      if(history === undefined || history === null || history.length === 0) {
        resolve(this._invokeHook(uuid));
      }
      
      // Check if stale
      if(history.length > 0 && moment.unix() - _.last(history).time > this.hooks[uuid].frequency) {
        // Hook is stale, invoke it!
        resolve(this._invokeHook(uuid));
      }
      
      // Hook is not stale
      return resolve(false);
    });
    
  }
  
  
  /**
   * Invoke Hook
   */
  _invokeHook(uuid) {
    
    if(this.runMode === 'dryRun') {
      logger.info('[DRYRUN] Not invoking: ' + this.hooks[uuid].name);
      return;
    }
    
    return new Promise((resolve, reject) => {
      logger.info('Invoking hook', uuid);
      
      // Create invocation entry array
      if(!this.invocationRegistry[uuid]) this.invocationRegistry[uuid] = [];
      
      // Get Hook
      let hook = this.hooks[uuid];
      
      // Check if there are any currently running?
      if(_.find(this.invocationRegistry[uuid], {status: 'running'})) {
        logger.warn('Hook ' + hook.name + ' is still running the last invocation');
        resolve();
        return;
      }
      
      // Create entry for invocation
      this.invocationRegistry[uuid].push({
        start: moment.unix(),
        end: null,
        result: null,
        status: 'running'
      });
      
      // Get run index for logging result
      let runIndex = this.invocationRegistry[uuid].length - 1;
      
      hook.obj.init()
        .then((result) => {
          
          this.invocationRegistry[uuid][runIndex].status = 'success';
          this.invocationRegistry[uuid][runIndex].result = result.summary;
          this.invocationRegistry[uuid][runIndex].end = moment.unix();
          
          console.log('Success hook invocation', uuid, this.hooks[uuid].name);
          
          resolve(true);
          return;
        })
        .catch((err) => {
          
          this.invocationRegistry[uuid][runIndex].status = 'failed';
          this.invocationRegistry[uuid][runIndex].result = err.message;
          this.invocationRegistry[uuid][runIndex].end = moment.unix();
          
          console.log(err);
          reject(false);
          return;
        });
      
    });
    
  }
  
  
  
  
}


module.exports = Synchro;