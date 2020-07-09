const HTTP_STATUS = require('http-status-codes');

const supertest = require('supertest');
const getPort = require('get-port');
const db = require('../../../../app/models');

const mockReportData = require('../../../testData/mockReportData.json');

const CONFIG = require('../../../../app/config');
const {listen} = require('../../../../app');

CONFIG.set('env', 'test');

const {username, password} = CONFIG.get('testing');

const LONGER_TIMEOUT = 50000;

let server;
let request;

// Start API
beforeAll(async () => {
  const port = await getPort({port: CONFIG.get('web:port')});
  server = await listen(port);
  request = supertest(server);
});

// Tests for /kb-matches endpoint
describe('', () => {
  let report;

  beforeAll(async () => {
    // Create Report and kbMatch
    report = await db.models.analysis_report.create({
      patientId: mockReportData.patientId,
    });
  }, LONGER_TIMEOUT);

  describe('', () => {
    test('', async () => {
      const res = await request
    });
  });

  // delete report
  afterAll(async () => {
    await db.models.analysis_report.destroy({where: {id: report.id}, force: true});
  }, LONGER_TIMEOUT);
});

afterAll(async () => {
  await server.close();
});
