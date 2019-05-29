const Syncro = require('../../../synchronizer/synchro');
const BioAppsSync = require('./BioApps');
const LIMSPath = require('./limsPathology');
const LIMSSeq = require('./limsSequencing');

const logger = require('../../../../lib/log');

module.exports = () => {
  logger.info('Initializing Tracking Syncronizers');

  // Setup Tracking Synchronizer Process
  const TrackingSync = new Syncro(60);

  // Setup Sync Processes
  const limsPath = new LIMSPath();
  const limsSeq = new LIMSSeq();
  const bioAppsSync = new BioAppsSync();

  TrackingSync.registerHook('BioApps', 600, bioAppsSync);
  TrackingSync.registerHook('LIMS.Pathology', 600, limsPath);
  TrackingSync.registerHook('LIMS.Sequencing', 600, limsSeq);

  // Start Sync
  TrackingSync.start();
};
