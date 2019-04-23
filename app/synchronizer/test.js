/*
 IPR-API - Integrated Pipeline Reports API

 COPYRIGHT 2016 MICHAEL SMITH GENOME SCIENCES CENTRE
 CONFIDENTIAL -- FOR RESEARCH PURPOSES ONLY

 Author: Brandon Pierce <bpierce@bcgsc.ca>
 Support JIRA ticket space: DEVSU

 This Node.JS script is designed to be run in ES6ES6 compliant mode

*/

const Syncro = require('./synchro'); // Import syncronizer Object
const logger = require('../../lib/log');

const SYNC_INTERVAL = 10; // number of seconds between syncs

logger.info('Starting Test Sync class');

/**
 * Lookup tasks pending pathology results
 *
 * @param {string} str - A string to be printed and returned
 * @param {integer} time - The number of milliseconds for this task to wait
 * @returns {Promise.<string>} - Returns the passed in string after the given time
 */
const task = async (str, time) => {
  setTimeout(() => {
    logger.info(`[${str}]`, `Waited ${time / 1000} seconds`);
    return str;
  }, time);
};

/**
 * Makes and returns a random 5 character string
 *
 * @returns {string} - Returns a random 5 character string
 */
const makeRand = () => {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (let i = 0; i < 5; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

class TestClass {
  constructor(options = {}) {
    this.dryrun = options.dryrun || false;
    logger.info('Set up Syncro Test Class');
  }

  /**
   * Initialize syncronization task
   *
   * @returns {Promise.<object>} - Returns an object with the summary and result from the tests
   */
  async init() {
    logger.info('Initializing Test Class Init()');

    try {
      const str = makeRand();
      let result = await task(str, 4500); // 1. Get Tasks pending pathology passed
      result = await task(result, 4000); // 2. Get the Sync user account
      result = await task(result, 5000); // 3. Query LIMS api with list of POGs awaiting Path passed

      logger.info(`[${result}]`, 'Finished Test Task Runner.');
      return {summary: 'Finished Test Task Runner.', result};
    } catch (error) {
      logger.error(`Failed to complete Task Test sync: ${error.message}`);
      console.error(error);
      return {summary: 'Failed to complete Test Task Runner', result: error};
    }
  }
}

// Create Synchronizer
const TestSyncro = new Syncro(SYNC_INTERVAL);

// Start Syncronizer
TestSyncro.start();

const run = new TestClass({});
TestSyncro.registerHook('TestSyncroClass', 30, run);

module.exports = TestSyncro;
