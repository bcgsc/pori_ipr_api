const HTTP_STATUS = require('http-status-codes');

const supertest = require('supertest');
const getPort = require('get-port');
const db = require('../../../app/models');

const mockReportData = require('../../testData/mockReportData.json');

const CONFIG = require('../../../app/config');
const {listen} = require('../../../app');

CONFIG.set('env', 'test');

const {username, password} = CONFIG.get('testing');

jest.mock('../../../app/middleware/auth.js');

const LONGER_TIMEOUT = 100000;

let server;
let request;

const checkReport = (report) => {
  [
    'tumourContent', 'ploidy', 'subtyping', 'ident', 'patientId',
    'seqQC', 'reportVersion', 'm1m2Score',
    'state', 'expression_matrix', 'alternateIdentifier', 'ageOfConsent',
    'biopsyDate', 'biopsyName', 'presentationDate', 'kbDiseaseMatch',
    'kbUrl', 'pediatricIds', 'captiv8Score', 'hrdetectScore', 'appendix',
    'genomeTmb',
  ].forEach((element) => {
    expect(report).toHaveProperty(element);
  });
  expect(report).toEqual(expect.not.objectContaining({
    id: expect.any(Number),
    reportId: expect.any(Number),
    deletedAt: expect.any(String),
    config: expect.any(String),
  }));
};

// Start API
beforeAll(async () => {
  const port = await getPort({port: CONFIG.get('web:port')});
  server = await listen(port);
  request = supertest(server);
});

describe('/reports/{REPORTID}', () => {
  let project;
  let report;

  beforeAll(async () => {
    // Get genomic template
    const template = await db.models.template.findOne({where: {name: 'genomic'}});
    // Create Report and associate projects
    project = await db.models.project.findOne({
      where: {
        name: 'TEST',
      },
    });
    // Assure project exists before creating report
    await db.models.project.findOrCreate({
      where: {
        name: 'TEST2',
      },
    });

    report = await db.models.report.create({
      templateId: template.id,
      patientId: mockReportData.patientId,
      tumourContent: 100,
      m1m2Score: 22.5,
    });
    await db.models.reportProject.create({
      reportId: report.id,
      project_id: project.id,
    });
  }, LONGER_TIMEOUT);

  describe('GET', () => {
    // Test regular GET
    test('fetches known ident ok', async () => {
      const res = await request
        .get(`/api/reports-async/${report.ident}`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      checkReport(res.body.report);
    });
  });

  describe('POST', () => {
    // Test regular GET
    test('create report ok', async () => {
      // create report
      const res = await request
        .post('/api/reports-async')
        .auth(username, password)
        .send(mockReportData)
        .type('json')
        .expect(HTTP_STATUS.ACCEPTED);

      expect(typeof res.body).toBe('object');

      const reportIdentQuery = res.body.ident;

      const result = await db.models.report.findOne({where: {ident: reportIdentQuery}, attributes: ['ident']});
      const reportIdentDB = result.ident;

      expect(reportIdentDB).toEqual(reportIdentQuery);
    });

    test('Upload fails with extra fields', async () => {
      const mockReport = JSON.parse(JSON.stringify(mockReportData));
      mockReport.extraField = 'extra';

      const res = await request
        .post('/api/reports-async')
        .auth(username, password)
        .send(mockReport)
        .type('json')
        .expect(HTTP_STATUS.BAD_REQUEST);

      expect(typeof res.body).toBe('object');
      expect(res.status).toEqual(HTTP_STATUS.BAD_REQUEST);
    }, LONGER_TIMEOUT);

    test('Upload works with ignored extra fields', async () => {
      // create report
      const mockReport = JSON.parse(JSON.stringify(mockReportData));
      mockReport.extraField = 'extra';

      const res = await request
        .post('/api/reports-async?ignore_extra_fields=true')
        .auth(username, password)
        .send(mockReport)
        .type('json')
        .expect(HTTP_STATUS.ACCEPTED);

      expect(typeof res.body).toBe('object');
      expect(res.status).toEqual(HTTP_STATUS.ACCEPTED);
    }, LONGER_TIMEOUT);
  });

  // delete report
  afterAll(async () => {
    await db.models.report.destroy({where: {id: report.id}});
  }, LONGER_TIMEOUT);
});

afterAll(async () => {
  global.gc && global.gc();
  await server.close();
});
