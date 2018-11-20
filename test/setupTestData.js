// Set Env
process.env.NODE_ENV = 'local';

// Dependencies
const db = require(`${process.cwd()}/app/models`);
const bcrypt = require('bcryptjs');
const logger = require('../lib/log');

const users = [
  {
    username: 'aUserForTesting', password: bcrypt.hashSync('aVerySecurePassword', 10), firstName: 'Test', lastName: 'User', access: 'clinician', authority: 'local',
  },
];


const createTestAccounts = async () => {
  try {
    await db.models.user.bulkCreate(users, {returning: true});
    logger.info('Created users for testing');
  } catch (err) {
    console.log(`Error creating users for testing: ${err}`);
  }
};

const deleteTestAccounts = async () => {
  const deleteUsers = ['aUserForTesting'];

  try {
    // need to set force to true since user table uses paranoid mode
    await db.models.user.destroy({where: {username: deleteUsers}, returning: true, force: true});
    logger.info('Deleted users for testing');
  } catch (err) {
    console.log(`Error deleting users for testing: ${err}`);
  }
};

const deleteTestTrackingStates = async () => db.models.tracking_state.destroy({where: {analysis_id: null}, force: true});

const createTestPatient = async () => {
  const patient = {
    POGID: 'TestPatient',
  };

  const testPatient = await db.models.POG.create(patient);
  return testPatient;
};

const createTestAnalysis = async () => {
  const testPatient = await createTestPatient();

  const analysis = {
    pog_id: testPatient.id,
  };

  const testAnalysis = await db.models.pog_analysis.create(analysis);
  return testAnalysis;
};

const createTestReport = async () => {
  const testAnalysis = await createTestAnalysis();

  let reportIdent = '';
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVQXYZ0123456789';

  for (let i = 0; i < 5; i++) {
    reportIdent += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  const report = {
    ident: reportIdent,
    analysis_id: testAnalysis.id,
  };

  const testReport = await db.models.analysis_report.create(report);
  return testReport;
};

module.exports = {
  createTestAccounts,
  deleteTestAccounts,
  deleteTestTrackingStates,
  createTestPatient,
  createTestAnalysis,
  createTestReport,
};
