process.env.NODE_ENV = 'test';

const supertest = require('supertest');
const getPort = require('get-port');
const db = require('../app/models');

const mockReportData = require('./testData/mockReportData.json');

const CONFIG = require('../app/config');
const {listen} = require('../app');

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

// Tests for uploading a report and all of its components
describe('', () => {
  let reportId;
  let reportIdent;

  beforeAll(async () => {
    // create report
    let res = await request
      .post('/api/reports')
      .auth(username, password)
      .send(mockReportData)
      .type('json')
      .expect(200);

    expect(typeof res.body).toBe('object');

    reportIdent = res.body.ident;

    // check that the report was created
    res = await request
      .get(`/api/reports/${reportIdent}`)
      .auth(username, password)
      .type('json')
      .expect(200);

    // get report id from patient info. because it's excluded in public view
    reportId = res.body.patientInformation.reportId;
  }, LONGER_TIMEOUT);

  // Test that all components were created
  test('', async () => {

  });

  // delete report
  afterAll(async () => {
    // delete newly created report and all of it's components
    // by hard deleting newly created report
    await db.models.analysis_report.destroy({where: {id: reportId}, force: true});

    // verify report is deleted
    await request
      .get(`/api/reports/${reportIdent}`)
      .auth(username, password)
      .type('json')
      .expect(404);
  }, LONGER_TIMEOUT);
});

afterAll(async () => {
  await server.close();
});
