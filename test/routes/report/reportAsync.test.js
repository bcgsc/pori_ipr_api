const HTTP_STATUS = require('http-status-codes');

const {v4: uuidv4} = require('uuid');
const supertest = require('supertest');
const getPort = require('get-port');
const db = require('../../../app/models');

const mockReportData = require('../../testData/mockReportData.json');

const CONFIG = require('../../../app/config');
const {listen} = require('../../../app');

CONFIG.set('env', 'test');

const {username, password} = CONFIG.get('testing');

jest.mock('../../../app/middleware/auth.js');

const LONGER_TIMEOUT = 50000;

let server;
let request;

const checkReport = (report) => {
  [
    'tumourContent', 'ploidy', 'subtyping', 'ident', 'patientId',
    'sampleInfo', 'seqQC', 'reportVersion', 'm1m2Score',
    'state', 'expression_matrix', 'alternateIdentifier', 'ageOfConsent',
    'biopsyDate', 'biopsyName', 'presentationDate', 'kbDiseaseMatch',
    'kbUrl', 'pediatricIds', 'captiv8Score', 'hrdetectScore', 'appendix',
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
  const randomUuid = uuidv4();

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

      checkReport(res.body);
    });
  });

  describe('POST', () => {
    // Test regular GET
    test.only('create report ok', async () => {
          // create report
      let res = await request
        .post('/api/reports-async')
        .auth(username, password)
        .send(mockReportData)
        .type('json')
        .expect(HTTP_STATUS.ACCEPTED);

      expect(typeof res.body).toBe('object');

      reportIdentQuery = res.body.ident;

      const result = await db.models.report.findOne({where: {ident: reportIdentQuery}, attributes: ['ident']});
      reportIdentDB = result.ident;

      expect(reportIdentDB).toEqual(reportIdentQuery)
    });
  });

  // delete report
  afterAll(async () => {
    await db.models.report.destroy({where: {id: report.id}, force: true});
  }, LONGER_TIMEOUT);
});

afterAll(async () => {
  global.gc && global.gc();
  await server.close();
});
