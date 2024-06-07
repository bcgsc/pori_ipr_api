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

describe('/reports/{REPORTID}/sample-info', () => {
  let report;
  let sampleInfo;

  const sampleInfoObject = {
    ident: expect.any(String),
    createdAt: expect.any(String),
    updatedAt: expect.any(String),
    sample: expect.any(String),
    pathoTc: expect.any(String),
    biopsySite: expect.any(String),
    biopsyType: expect.any(String),
    sampleName: expect.any(String),
    primarySite: expect.any(String),
    collectionDate: expect.any(String),
  };

  beforeAll(async () => {
    // Get genomic template
    const template = await db.models.template.findOne({where: {name: 'genomic'}});
    // Create Report and sample info
    report = await db.models.report.create({
      templateId: template.id,
      patientId: mockReportData.patientId,
    });
    sampleInfo = await db.models.reportSampleInfo.create({
      reportId: report.id,
      sample: 'sample',
      pathoTc: 'patho tc',
      biopsySite: 'biopsy site',
      biopsyType: 'biopsy type',
      sampleName: 'sample name',
      primarySite: 'primary site',
      collectionDate: '12-10-2020',
    });
  }, LONGER_TIMEOUT);

  describe('GET', () => {
    test('Getting a list of sample info is ok', async () => {
      const res = await request
        .get(`/api/reports/${report.ident}/sample-info`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      expect(res.body).toEqual(expect.arrayContaining([
        expect.objectContaining(sampleInfoObject),
      ]));

      expect(res.body).not.toHaveProperty('id');
      expect(res.body).not.toHaveProperty('reportId');
      expect(res.body).not.toHaveProperty('deletedAt');
    });

    test('Getting a specific sample info is ok', async () => {
      const res = await request
        .get(`/api/reports/${report.ident}/sample-info/${sampleInfo.ident}`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      expect(res.body).toEqual(expect.objectContaining(sampleInfoObject));
    });
  });

  describe('POST', () => {
    test('Creating a new valid sample info is ok', async () => {
      const newSample = 'newsample';
      const res = await request
        .post(`/api/reports/${report.ident}/sample-info`)
        .send({
          sample: newSample,
          pathoTc: 'patho tc',
          biopsySite: 'biopsy site',
          biopsyType: 'biopsy type',
          sampleName: 'sample name',
          primarySite: 'primary site',
          collectionDate: '12-10-2020',
        })
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.CREATED);

      expect(res.body).toEqual(expect.objectContaining(sampleInfoObject));
      expect(res.body.sample).toEqual(newSample);

      expect(res.body).not.toHaveProperty('id');
      expect(res.body).not.toHaveProperty('reportId');
      expect(res.body).not.toHaveProperty('deletedAt');
    });
  });

  describe('PUT', () => {
    test('Updating a sample info is ok', async () => {
      const biopsySite = 'New Biopsy Site';
      const res = await request
        .put(`/api/reports/${report.ident}/sample-info/${sampleInfo.ident}`)
        .send({
          biopsySite,
        })
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      expect(res.body).toEqual(expect.objectContaining(sampleInfoObject));
      expect(res.body.biopsySite).toEqual(biopsySite);
    });
  });

  describe('DELETE', () => {
    test('Deleting a sample info is ok', async () => {
      const deleteSampleInfo = await db.models.reportSampleInfo.create({
        reportId: report.id,
        sample: 'deleteSample',
      });

      await request
        .delete(`/api/reports/${report.ident}/sample-info/${deleteSampleInfo.ident}`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.NO_CONTENT);

      expect(
        await db.models.reportSampleInfo.findOne({
          where: {ident: deleteSampleInfo.ident},
        }),
      ).toBe(null);
    });
  });

  // delete report
  afterAll(async () => {
    await db.models.report.destroy({where: {ident: report.ident}});
  }, LONGER_TIMEOUT);
});

afterAll(async () => {
  global.gc && global.gc();
  await server.close();
});
