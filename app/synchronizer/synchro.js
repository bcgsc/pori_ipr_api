"use strict";

const uuidv4        = require('uuid/v4');
const moment        = require('moment');
const db            = require(process.cwd() + '/app/models');
const _             = require('lodash');

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
          console.log('Invocation', round, ' | Waiting another ' + this.interval + 's');
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
   * @param {integer} frequency - Number of sections between iterations
   * @param {function} fn - The function to be invoked on each iteration
   *
   * @returns {object} - Returns the UUID
   */
  registerHook(name, frequency, fn) {
  
    let uuid = uuidv4();
    
    this.hooks[uuid] = {
      fn: fn,
      name: name,
      frequency: frequency
    };
    
    this.hookMap[name] = uuid;
    
    console.log('Hook registered: ', this.hooks[uuid].name, uuid);
    
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
    
    return new Promise((resolve, reject) => {
      console.log('Invoking hook', uuid);
  
      let hook = this.hooks[uuid];
  
      hook.fn()
        .then((result) => {
          this.invocationRegistry[uuid].push({
            time: moment.unix(),
            result: result.summary,
            success: true
          });
          
          console.log('Success hook invocation', uuid, this.hooks[uuid].name);
          
          resolve(true);
        })
        .catch((err) => {
          this.invocationRegistry[uuid].push({
            time: moment.unix(),
            result: err.message,
            success: false
          });
          reject(false);
        });
      
    });
  
  }
  
  
  
  
}


module.exports = Synchro;