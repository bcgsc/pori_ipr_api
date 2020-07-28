const HTTP_STATUS = require('http-status-codes');

const supertest = require('supertest');
const getPort = require('get-port');
const db = require('../../../app/models');

const mockReportData = require('../../testData/mockReportData.json');

const CONFIG = require('../../../app/config');
const {listen} = require('../../../app');

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

describe('/reports/{REPORTID}/discussion', () => {
  let report;
  let discussion;
  let user;

  beforeAll(async () => {
    // Create Report and discussion
    report = await db.models.analysis_report.create({
      patientId: mockReportData.patientId,
    });
    user = await db.models.user.findOne({
      where: {username},
    });
    discussion = await db.models.presentation_slides.create({
      reportId: report.id,
      body: 'Patient is currently stable and maintained on Flourouracil + Irinotecan + Bevacizumab. The highly expressed TOP1 may explain the good response to this therapy.',
      user_id: user.id,
    });
  }, LONGER_TIMEOUT);

  describe('GET', () => {
    test('', async () => {

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
