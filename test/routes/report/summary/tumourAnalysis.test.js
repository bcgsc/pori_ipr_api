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

const tumourAnalysisProperties = [];

const checkTumourAnalysis = (tumourObject) => {
  tumourAnalysisProperties.forEach((element) => {
    expect(tumourObject).toHaveProperty(element);
  });
  expect(tumourObject).toEqual(expect.not.objectContaining({
    id: expect.any(Number),
    reportId: expect.any(Number),
    deletedAt: expect.any(String),
  }));
};

// Start API
beforeAll(async () => {
  const port = await getPort({port: CONFIG.get('web:port')});
  server = await listen(port);
  request = supertest(server);
});

describe('/reports/{REPORTID}/summary/tumour-analysis', () => {
  let report;

  beforeEach(async () => {
    // Create Report and Mutation Summary
    report = await db.models.analysis_report.create({
      patientId: mockReportData.patientId,
    });

    await db.models.tumourAnalysis.create({
      reportId: report.id,
      tumourContent: 61,
      ploidy: 'tetraploid',
    });
  }, LONGER_TIMEOUT);

  describe('GET', () => {
    test('Getting a Tumour Analysis is OK', async () => {
      const res = await request
        .get(`/api/reports/${report.ident}/summary/tumour-analysis`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      checkTumourAnalysis(res.body);
    });
  });

  describe('PUT', () => {
    test('Updating a Tumour Analysis is OK', async () => {
      const res = await request
        .put(`/api/reports/${report.ident}/summary/tumour-analysis`)
        .auth(username, password)
        .type('json')
        .send({
          reportId: 1,
        })
        .expect(HTTP_STATUS.OK);

      checkTumourAnalysis(res.body);
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
