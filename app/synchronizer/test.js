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

//let logger        = require('winston'); // Load logging library
let logger        = process.logger;

logger.info('Starting Test Sync class');

class TestClass {
  
  constructor (options={}) {
    this.dryrun = options.dryrun || false;
    logger.info('Set up Syncro Test Class');
  }
  
  /**
   * Initialize syncronization task
   *
   * @returns {Promise}
   */
  init() {
    return new Promise((resolve, reject) => {
      
      logger.info('Initializing Test Class Init()');
      
      this.task1()                          // 1. Get Tasks pending pathology passed
        .then(this.task2.bind(this))               // 2. Get the Sync user account
        .then(this.task3.bind(this))            // 3. Query LIMS api with list of POGs awaiting Path passed
        .then((result) => {                               // 9. Profit.
          
          logger.info(`[${result}]`, 'Finished Test Task Runner.');
          resolve({summary: 'Finished Test Task Runner.', result: result});
        })
        .catch((err) => {
          logger.error('Failed to complete Task Test sync: ' + err.message);
          console.log(err);
          this._reset(); // Reset
          
        });
      
    });
  }
  
  /**
   * Lookup tasks pending pathology results
   *
   * @returns {Promise}
   */
  task1 () {
    return new Promise((resolve, reject) => {
      
      let str = this.makeRand();
      
      setTimeout(() => {
        logger.info(`[${str}]`, 'Waited 4.5 seconds');
        resolve(str);
        }, 4500);
    });
  }
  
  /**
   * Query LIMS Sample endpoint for POGs that have results
   *
   * @returns {Promise}
   */
  task2(str) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        logger.info(`[${str}]`, 'Waited 4 seconds');
        resolve(str);
      }, 4000);
    });
  }
  
  /**
   * Query LIMS Sample endpoint for POGs that have results
   *
   * @returns {Promise}
   */
  task3(str) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        logger.info(`[${str}]`, 'Waited 5 seconds');
        resolve(str);
      }, 5000);
    
    });
  }
  
  makeRand() {
    let text = "";
    let possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    
    for (let i = 0; i < 5; i++)
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    
    return text;
  }
  
  
}

// Create Synchronizer
let TestSyncro = new Syncro(10);

// Start Syncronizer
TestSyncro.start();

let run = new TestClass({});
TestSyncro.registerHook('TestSyncroClass', 30, run);
//run.init();

module.exports = TestSyncro;