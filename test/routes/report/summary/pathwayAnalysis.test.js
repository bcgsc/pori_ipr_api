const HTTP_STATUS = require('http-status-codes');

const path = require('path');
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

describe('', () => {
  let report;

  beforeEach(async () => {
    // Create Report and Mutation Summary
    report = await db.models.analysis_report.create({
      patientId: mockReportData.patientId,
    });
  }, LONGER_TIMEOUT);

  describe('GET', () => {
    test('', async () => {
      const res = await request
        .put(`/api/reports/LVZPX/summary/pathway-analysis`)
        .auth(username, password)
        .type('json')
        .attach('pathway', path.join(__dirname, '/../../../testData/pathwayAnalysisData.txt'))
        .expect(HTTP_STATUS.OK);

    });
  });

  // delete report
  afterEach(async () => {
    await db.models.analysis_report.destroy({where: {id: report.id}, force: true});
  }, LONGER_TIMEOUT);
});

afterAll(async () => {
  await server.close();
});
