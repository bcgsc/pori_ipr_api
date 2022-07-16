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
  'cdsBasesIn1To22AndXAndY', 'cdsSnvs', 'cdsIndels', 'cdsSnvTmb', 'cdsIndelTmb',
  'proteinSnvs', 'proteinIndels', 'proteinSnvTmb', 'proteinIndelTmb', 'msiScore'];

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
        })
        .expect(HTTP_STATUS.OK);

      checkTmburMutationBurden(res.body);
      expect(res.body).toHaveProperty('cdsSnvs', 64);
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
  });

  // delete report
  afterEach(async () => {
    await db.models.report.destroy({where: {id: report.id}, force: true});
  }, LONGER_TIMEOUT);
});

afterAll(async () => {
  await server.close();
});
