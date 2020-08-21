const HTTP_STATUS = require('http-status-codes');

const uuidv4 = require('uuid/v4');
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

const checkReport = (report) => {
  [
    'tumourContent', 'ploidy', 'subtyping', 'ident', 'patientId',
    'sampleInfo', 'seqQC', 'reportVersion',
    'state', 'expression_matrix', 'alternateIdentifier', 'ageOfConsent',
    'biopsyDate', 'biopsyName', 'presentationDate', 'kbDiseaseMatch',
    'kbUrl',
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

  let report;
  let totalReports;

  beforeEach(async () => {
    // Create Report and Mutation Burden
    report = await db.models.analysis_report.create({
      patientId: mockReportData.patientId,
      tumourContent: 100,
    });
  }, LONGER_TIMEOUT);

  describe('GET', () => {
    test('fetches known ident ok', async () => {
      const res = await request
        .get(`/api/reports/${report.ident}`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      checkReport(res.body);
    });

    test('Querying states should return less reports', async () => {
      let res = await request
        .get('/api/reports')
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      totalReports = res.body.total;

      res = await request
        .get('/api/reports')
        .query({states: 'reviewed,archived'})
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      expect(res.body.total).toBeLessThan(totalReports);
      totalReports = res.body.total;

      res = await request
        .get('/api/reports')
        .query({
          states: 'reviewed,archived',
          role: 'bioinformatician',
        })
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      expect(res.body.total).toBeLessThan(totalReports);
    });

    test('error on non-existant ident', async () => {
      await request
        .get(`/api/reports/${randomUuid}`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.NOT_FOUND);
    });
  });

  describe('PUT', () => {
    test('tumour content update OK', async () => {
      const res = await request
        .put(`/api/reports/${report.ident}`)
        .auth(username, password)
        .type('json')
        .send({
          tumourContent: 23.2,
        })
        .expect(HTTP_STATUS.OK);

      checkReport(res.body);
      expect(res.body).toHaveProperty('tumourContent', 23.2);
    });

    test('ploidy update OK', async () => {
      const res = await request
        .put(`/api/reports/${report.ident}`)
        .auth(username, password)
        .type('json')
        .send({
          ploidy: 'triploid',
        })
        .expect(HTTP_STATUS.OK);

      checkReport(res.body);
      expect(res.body).toHaveProperty('ploidy', 'triploid');
    });

    test('subtyping update OK', async () => {
      const res = await request
        .put(`/api/reports/${report.ident}`)
        .auth(username, password)
        .type('json')
        .send({
          subtyping: 'ER positive',
        })
        .expect(HTTP_STATUS.OK);

      checkReport(res.body);
      expect(res.body).toHaveProperty('subtyping', 'ER positive');
    });

    test('error on unexpected value', async () => {
      const res = await request
        .put(`/api/reports/${report.ident}`)
        .auth(username, password)
        .type('json')
        .send({
          badValue: 'SYTHR',
        })
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
