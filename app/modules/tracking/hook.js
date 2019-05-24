const render = require('json-templater/string');
const db = require('../../models');
const Email = require('../../modules/notification/email');

const logger = require('../../../lib/log');

// ** --- Hook Type Handlers --- ** //

/**
 * Send email on hook invoke
 *
 * @param {object} hook - Hook object
 * @param {object} state - State object
 * @param {object} [task] - Task object
 *
 * @returns {undefined}
 */
const hookEmail = async (hook, state, task = null) => {
  const {analysis} = state;
  const {pog} = analysis;

  const data = {
    state, task, analysis, patient: pog,
  };

  const email = new Email();
  email
    .setRecipient(hook.target)
    .setSubject(render(hook.payload.subject, data))
    .setBody(render(hook.payload.body, data));

  try {
    await email.send();
  } catch (error) {
    logger.error(`Unable to send email hook: ${hook} error: ${error}`);
    throw new Error(`Unable to send email hook: ${hook} error: ${error}`);
  }
};

/**
 * Check if hooks exist
 *
 * @param {string} state - State slug name
 * @param {string} status - Updated status/state
 * @param {string} task - Task slug name
 * @param {boolean} enabled - Only enabled tasks
 *
 * @returns {Promise.<Array.<object>>} - Returns hooks for state and task
 */
const check_hook = async (state, status, task = null, enabled = true) => {
  const opts = {
    where: {
      state_name: state,
      status,
      task_name: task || null,
    },
  };

  // Only if enabled?
  if (enabled) {
    opts.where.enabled = true;
  }

  // Check if a hook exists
  try {
    const hooks = await db.models.tracking_hook.findAll(opts);
    return hooks;
  } catch (error) {
    logger.error(`Unable to retrieve hooks for ${state} (${task})`);
    throw new Error(`Unable to retrieve hooks for ${state} (${task})`);
  }
};

/**
 * Invoke a hook
 *
 * @param {object} hook - Model instance object for specified hook
 * @param {object} state - Model instance object for specified state
 * @param {object} task - Model instance object for specified task
 *
 * @returns {undefined}
 */
const invoke_hook = (hook, state, task = null) => {
  if (hook.action === 'email') {
    hookEmail(hook, state, task);
  }
};

/**
 * Check and invoke hooks
 *
 * @param {object} state - The state model object instance
 * @param {string} status - The transition-to state of the referenced object
 * @param {object=} task - The optional task model instance
 * @param {boolean=} enabled - Enabled override
 *
 * @returns {undefined}
 */
const check_and_invoke = async (state, status, task = null, enabled = true) => {
  const taskSlug = (task) ? task.slug : null;

  let hooks;
  try {
    hooks = await check_hook(state.slug, status, taskSlug, enabled);
  } catch (error) {
    logger.error(`Failed to check hook ${error}`);
    throw new Error(`Failed to check hook ${error}`);
  }

  try {
    const promises = hooks.map((hook) => {
      return invoke_hook(hook, state, task);
    });

    await Promise.all(promises);
  } catch (error) {
    logger.error(`Failed to retrieve and invoke hooks ${error}`);
    throw new Error(`Failed to retrieve and invoke hooks ${error}`);
  }
};

module.exports = {
  check_hook,
  invoke_hook,
  check_and_invoke,
};
