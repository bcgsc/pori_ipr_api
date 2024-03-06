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

const tmburMutationBurdenProperties = ['ident', 'updatedAt', 'createdAt',
  'tumour', 'normal', 'nonNBasesIn1To22AndXAndY',
  'totalGenomeSnvs', 'totalGenomeIndels', 'genomeSnvTmb', 'genomeIndelTmb',
  'adjustedTmb', 'adjustedTmbComment', 'tmbHidden', 'cdsBasesIn1To22AndXAndY', 'cdsSnvs',
  'cdsIndels', 'cdsSnvTmb', 'cdsIndelTmb', 'proteinSnvs', 'proteinIndels',
  'proteinSnvTmb', 'proteinIndelTmb', 'msiScore', 'kbCategory', 'comments', 'displayName'];

const checkTmburMutationBurden = (tmburMutationObject) => {
  tmburMutationBurdenProperties.forEach((element) => {
    expect(tmburMutationObject).toHaveProperty(element);
  });
  expect(tmburMutationObject).toEqual(expect.not.objectContaining({
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

// Tests for /tmburMutationBurden endpoint
describe('/reports/{REPORTID}/tmbur-mutation-burden', () => {
  let report;
  let emptyReport;

  beforeEach(async () => {
    // Get genomic template
    const template = await db.models.template.findOne({where: {name: 'genomic'}});
    // Create Report and Mutation Burden
    report = await db.models.report.create({
      templateId: template.id,
      patientId: mockReportData.patientId,
    });

    await db.models.tmburMutationBurden.create({
      reportId: report.id,
      ...mockReportData.tmburMutationBurden,
    });

    // Create empty report
    emptyReport = await db.models.report.create({
      templateId: template.id,
      patientId: mockReportData.patientId,
    });
  }, LONGER_TIMEOUT);

  describe('GET', () => {
    test('Getting tmbur mutation burden records is OK', async () => {
      const res = await request
        .get(`/api/reports/${report.ident}/tmbur-mutation-burden`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      checkTmburMutationBurden(res.body);
    });
  });

  describe('PUT', () => {
    test('valid update is OK', async () => {
      const res = await request
        .put(`/api/reports/${report.ident}/tmbur-mutation-burden`)
        .auth(username, password)
        .type('json')
        .send({
          cdsSnvs: 64,
          comments: 'new comment',
          displayName: 'New display name',
        })
        .expect(HTTP_STATUS.OK);

      checkTmburMutationBurden(res.body);
      expect(res.body).toEqual(expect.objectContaining(
        {
          cdsSnvs: 64,
          comments: 'new comment',
          displayName: 'New display name',
        },
      ));
    });

    test('error on unexpected value', async () => {
      await request
        .put(`/api/reports/${report.ident}/tmbur-mutation-burden`)
        .auth(username, password)
        .type('json')
        .send({
          comparator: 'SYTHR',
        })
        .expect(HTTP_STATUS.BAD_REQUEST);
    });

    test('/ - 201 successful create', async () => {
      const createData = {
        ...mockReportData.tmburMutationBurden[0],
      };
      const res = await request
        .post(`/api/reports/${report.ident}/tmbur-mutation-burden`)
        .auth(username, password)
        .type('json')
        .send(createData)
        .expect(HTTP_STATUS.CREATED);

      checkTmburMutationBurden(res.body);
      expect(res.body).toEqual(expect.objectContaining(createData));
    });

    test('/ - 201 successful create on empty report', async () => {
      const createData = {
        ...mockReportData.tmburMutationBurden[0],
      };
      const res = await request
        .post(`/api/reports/${emptyReport.ident}/tmbur-mutation-burden`)
        .auth(username, password)
        .type('json')
        .send(createData)
        .expect(HTTP_STATUS.CREATED);

      checkTmburMutationBurden(res.body);
      expect(res.body).toEqual(expect.objectContaining(createData));
    });

    test('/ - 400 bad create request (report id included)', async () => {
      await request
        .post(`/api/reports/${report.ident}/tmbur-mutation-burden`)
        .auth(username, password)
        .type('json')
        .send({
          ...mockReportData.tmburMutationBurden[0],
          reportId: report.id,
        })
        .expect(HTTP_STATUS.BAD_REQUEST);
    });
  });

  // delete report
  afterEach(async () => {
    await db.models.report.destroy({where: {id: report.id}, force: true});
  }, LONGER_TIMEOUT);
});

afterAll(async () => {
  global.gc && global.gc();
  await server.close();
});
