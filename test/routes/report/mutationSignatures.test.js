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

const checkMutationSignature = (signature) => {
  [
    'ident',
    'signature',
    'nnls',
    'pearson',
    'kbCategory',
    'selected',
    'associations',
    'numCancerTypes',
    'cancerTypes',
  ].forEach((element) => {
    expect(signature).toHaveProperty(element);
  });
  expect(signature).toEqual(expect.not.objectContaining({
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

describe('/reports/{REPORTID}/mutation-signatures', () => {
  let report;
  let signature;
  let selectedSignature;

  beforeEach(async () => {
    // Get genomic template
    const template = await db.models.template.findOne({where: {name: 'genomic'}});
    report = await db.models.report.create({
      templateId: template.id,
      patientId: mockReportData.patientId,
    });
    signature = await db.models.mutationSignature.create({
      reportId: report.id,
      nnls: 0.0123,
      signature: 'SBS1',
      kbCategory: 'slight',
      selected: false,
    });
    selectedSignature = await db.models.mutationSignature.create({
      reportId: report.id,
      nnls: 0.4,
      signature: 'SBS2',
      kbCategory: 'strong',
      selected: true,
    });
  }, LONGER_TIMEOUT);

  describe('GET', () => {
    test('Getting all signatures is ok', async () => {
      const res = await request
        .get(`/api/reports/${report.ident}/mutation-signatures`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(2);
      res.body.map((s) => {
        return checkMutationSignature(s);
      });
    });

    test('?selected=true', async () => {
      const res = await request
        .get(`/api/reports/${report.ident}/mutation-signatures`)
        .query({selected: true})
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(1);
      res.body.map((s) => {
        return checkMutationSignature(s);
      });
      expect(res.body[0]).toHaveProperty('ident', selectedSignature.ident);
    });

    test('?selected=false', async () => {
      const res = await request
        .get(`/api/reports/${report.ident}/mutation-signatures`)
        .query({selected: false})
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(1);
      res.body.map((s) => {
        return checkMutationSignature(s);
      });
      expect(res.body[0]).toHaveProperty('ident', signature.ident);
    });
  });

  describe('PUT', () => {
    test('select a signature', async () => {
      const res = await request
        .put(`/api/reports/${report.ident}/mutation-signatures/${signature.ident}`)
        .auth(username, password)
        .type('json')
        .send({selected: true})
        .expect(HTTP_STATUS.OK);

      checkMutationSignature(res.body);
      expect(res.body).toHaveProperty('selected', true);
    });

    test('de-select a signature', async () => {
      const res = await request
        .put(`/api/reports/${report.ident}/mutation-signatures/${selectedSignature.ident}`)
        .auth(username, password)
        .type('json')
        .send({selected: false})
        .expect(HTTP_STATUS.OK);

      checkMutationSignature(res.body);
      expect(res.body).toHaveProperty('selected', false);
    });

    test('error on given ident', async () => {
      await request
        .put(`/api/reports/${report.ident}/mutation-signatures/${signature.ident}`)
        .auth(username, password)
        .type('json')
        .send({ident: signature.ident, selected: true})
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
