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

const pathwayProperties = ['ident', 'createdAt', 'updatedAt', 'original', 'pathway'];

const checkPathwayAnalysis = (pathwayObject) => {
  pathwayProperties.forEach((element) => {
    expect(pathwayObject).toHaveProperty(element);
  });
  expect(pathwayObject).not.toHaveProperty('id');
  expect(pathwayObject).not.toHaveProperty('deletedAt');
  expect(pathwayObject).not.toHaveProperty('reportId');
};

// Start API
beforeAll(async () => {
  const port = await getPort({port: CONFIG.get('web:port')});
  server = await listen(port);
  request = supertest(server);
});

describe('/reports/{report}/summary/pathway-analysis', () => {
  let report;

  beforeEach(async () => {
    // Create Report and Mutation Summary
    report = await db.models.analysis_report.create({
      patientId: mockReportData.patientId,
    });

    await db.models.pathwayAnalysis.create({
      reportId: report.id,
    });
  }, LONGER_TIMEOUT);

  describe('GET', () => {
    test('Getting a pathway analysis is ok', async () => {
      const res = await request
        .get(`/api/reports/${report.ident}/summary/pathway-analysis`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      checkPathwayAnalysis(res.body);
    });
  });

  describe('PUT', () => {
    test('Updating a pathway analysis is ok', async () => {
      const res = await request
        .put(`/api/reports/${report.ident}/summary/pathway-analysis`)
        .auth(username, password)
        .type('json')
        .attach('pathway', 'test/testData/images/pathwayAnalysisData.svg')
        .expect(HTTP_STATUS.OK);

      checkPathwayAnalysis(res.body);
      expect(res.body.pathway).not.toBe(null);
    });

    test('Updating a pathway without providing a file should error', async () => {
      await request
        .put(`/api/reports/${report.ident}/summary/pathway-analysis`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.BAD_REQUEST);
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
