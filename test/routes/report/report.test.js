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
  let reportReady;
  let reportReviewed;
  let reportArchived;
  let totalReports;

  beforeEach(async () => {
    // Get genomic template
    const template = await db.models.template.findOne({where: {name: 'genomic'}});
    // Create Report and associate projects
    const project = await db.models.project.findOne({
      where: {
        name: 'TEST',
      },
    });

    report = await db.models.analysis_report.create({
      templateId: template.id,
      patientId: mockReportData.patientId,
      tumourContent: 100,
    });
    await db.models.reportProject.create({
      reportId: report.id,
      project_id: project.id,
    });

    reportReady = await db.models.analysis_report.create({
      templateId: template.id,
      patientId: mockReportData.patientId,
      state: 'ready',
    });
    await db.models.reportProject.create({
      reportId: reportReady.id,
      project_id: project.id,
    });

    reportReviewed = await db.models.analysis_report.create({
      templateId: template.id,
      patientId: mockReportData.patientId,
      state: 'reviewed',
    });
    await db.models.reportProject.create({
      reportId: reportReviewed.id,
      project_id: project.id,
    });

    reportArchived = await db.models.analysis_report.create({
      templateId: template.id,
      patientId: mockReportData.patientId,
      state: 'archived',
    });
    await db.models.reportProject.create({
      reportId: reportArchived.id,
      project_id: project.id,
    });

    totalReports = await db.models.analysis_report.count();
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

    test('No queries is OK', async () => {
      // TODO: Add checks when https://www.bcgsc.ca/jira/browse/DEVSU-1273 is done
      const res = await request
        .get('/api/reports')
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      // Check if the number of reports returned by api is the same as db
      expect(res.body.total).toEqual(totalReports);
    });

    test('State querying is OK', async () => {
      // TODO: Add checks when https://www.bcgsc.ca/jira/browse/DEVSU-1273 is done
      const res = await request
        .get('/api/reports')
        .query({states: 'reviewed,archived'})
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      res.body.reports.forEach((reportObject) => {
        expect(reportObject.state === 'reviewed' || reportObject.state === 'archived').toBeTruthy();
      });
    });

    test('Multiple queries is OK', async () => {
      // TODO: Add checks when https://www.bcgsc.ca/jira/browse/DEVSU-1273 is done
      const res = await request
        .get('/api/reports')
        .query({
          states: 'reviewed,archived',
          role: 'bioinformatician',
        })
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      res.body.reports.forEach((reportObject) => {
        expect(reportObject.state === 'reviewed' || reportObject.state === 'archived').toBeTruthy();
        expect(reportObject.users.some((user) => { return user.role === 'bioinformatician'; })).toBeTruthy();
      });
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
      await request
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
    await db.models.analysis_report.destroy({where: {id: reportReady.id}, force: true});
    await db.models.analysis_report.destroy({where: {id: reportReviewed.id}, force: true});
    await db.models.analysis_report.destroy({where: {id: reportArchived.id}, force: true});
  }, LONGER_TIMEOUT);
});

afterAll(async () => {
  await server.close();
});
