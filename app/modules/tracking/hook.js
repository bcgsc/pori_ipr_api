"use strict";

const db              = require(`${process.cwd()}/app/models`);
const _               = require('lodash');
const logger          = require('../../../lib/log');
const Email           = require(`${process.cwd()}/app/modules/notification/email`);
const render          = require('json-templater/string');



/** --- Hook Type Handlers --- **/


/**
 * Send email on hook invoke
 *
 * @param {object} hook - Hook object
 * @param {object} state - State object
 * @param {object} [task] - Task object
 *
 * @returns {Promise}
 */
let hook_email = (hook, state, task=null) => {
  return new Promise((resolve, reject) => {
    
    let analysis = state.analysis;
    let pog = state.analysis.pog;
    
    let data = {state: state, task: task, analysis: analysis, patient: pog};
    
    let email = new Email();
    email
      .setRecipient(hook.target)
      .setSubject(render(hook.payload.subject, data))
      .setBody(render(hook.payload.body, data))
      .send()
      .then((result) => {
        resolve(result);
      })
      .catch((e) => {
        logger.error('Unable to send email hook', e.message);
        console.log('Unable to send email hook', e);
      });
    
  
  });
};

/**
 * Check if hooks exist
 *
 * @param {string} state - State slug name
 * @param {string} status - Updated status/state
 * @param {string} task - Task slug name
 * @param {boolean} enabled - Only enabled tasks
 *
 * @returns {Promise}
 */
let check_hook = (state, status, task=null, enabled=true) => {
  return new Promise((resolve, reject) => {
    
    let opts = {
      where: {
        state_name: state,
        status: status
      }
    };

    opts.where.task_name = task ? task : null;
    
    // Only if enabled?
    if(enabled) opts.where.enabled = true;
    
    // Check if a hook exists
    db.models.tracking_hook.findAll(opts)
      .then((hooks) => {
        resolve(hooks);
      })
      .catch((err) => {
        logger.error(`Unable to retrieve hooks for ${state} (${task})`);
        reject({message: `failed to retrieve hooks for ${state} (${task})`});
        console.log(err);
      });
    
  });
};

/**
 * Invoke a hook
 *
 * @param {object} hook - Model instance object for specified hook
 * @param {object} state - Model instance object for specified state
 * @param {object} task - Model instance object for specified task
 *
 * @returns {Promise} - Resolves with status
 */
let invoke_hook = (hook, state, task=null) => {
  switch(hook.action) {
    case 'email':
      return hook_email(hook, state, task);
      break;
  }
};


/** Module Interface **/
module.exports = {
  
  /**
   * Check if hooks exist
   *
   * @param {string} state - State slug name
   * @param {string} status - Updated status/state
   * @param {string} task - Task slug name
   * @param {boolean} enabled - Only enabled tasks
   *
   * @returns {Promise}
   */
  check_hook: (state, status, task=null, enabled=true) => {
    return check_hook(state, status, task, enabled);
  },
  
  /**
   * Invoke a hook
   *
   * @param {object} hook - Model instance object for specified hook
   * @param {object} state - Model instance object for specified state
   * @param {object} task - Model instance object for specified task
   *
   * @returns {Promise} - Resolves with status
   */
  invoke_hook: (hook, state, task=null) => {
    return invoke_hook(hook, state, task=null);
  },
  
  /**
   * Check and invoke hooks
   *
   *
   * @param {object} state - The state model object instance
   * @param {string} status - The transition-to state of the referenced object
   * @param {object=} task - The optional task model instance
   * @param {boolean=} enabled - Enabled override
   * @returns {Promise}
   */
  check_and_invoke: (state, status, task=null, enabled=true) => {
    return new Promise((resolve, reject) => {
      
      let t = (task) ? task.slug : null;
      
      check_hook(state.slug, status, t, enabled)
        .then((hooks) => {
          return Promise.all(_.map(hooks, (h) => { return invoke_hook(h, state, task) }))
        })
        .then((r) => {
          resolve(true);
        })
        .catch((e) => {
          reject({message: 'Failed to retrieve and invoke hooks'});
          console.log(e);
        });
    });
  },
  
};