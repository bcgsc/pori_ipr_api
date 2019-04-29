"use strict";

/*
 * IPR-API - Integrated Pipeline Reports API
 * Copyright 2017 Michael Smith Genome Sciences Center
 * Author: Brandon Pierce <bpierce@bcgsc.ca>
 * JIRA Ticketspace: DEVSU
 *
 * This Node.JS script is designed to be run in ES6ES6 compliant mode
 *
 */

const Syncro      = require(process.cwd() + '/app/synchronizer/synchro'); // Import syncronizer Object
const db          = require(process.cwd() + '/app/models/'); // Load database
const _           = require('lodash');
const moment      = require('moment');
const BioAppsSync = require('./BioApps');
const LIMSPath    = require('./limsPathology');
const LIMSSeq     = require('./limsSequencing');

let logger        = require('../../../../lib/log');

module.exports = function() {
  
  logger.info('Initializing Tracking Syncronizers');
  
  // Setup Tracking Synchronizer Process
  let TrackingSync = new Syncro(60);
  
  // Setup Sync Processes
  let limsPath    = new LIMSPath();
  let limsSeq     = new LIMSSeq();
  let bioAppsSync = new BioAppsSync();
  
  TrackingSync.registerHook('BioApps', 600, bioAppsSync);
  TrackingSync.registerHook('LIMS.Pathology', 600, limsPath);
  TrackingSync.registerHook('LIMS.Sequencing', 600, limsSeq);
  
  // Start Sync
  TrackingSync.start();
  
};