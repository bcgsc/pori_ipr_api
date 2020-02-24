const HTTP_STATUS = require('http-status-codes');
const supertest = require('supertest');
const getPort = require('get-port');

const db = require('../../../app/models');
// get test user info
const CONFIG = require('../../../app/config');
const {listen} = require('../../../app');

// get credentials from the CONFIG
CONFIG.set('env', 'test');
const {username, password} = CONFIG.get('testing');

const BASE_URL = '/api/1.0/germline_small_mutation';


describe('/germline_small_mutation/patient/:patient/biopsy/:analysis/report/:gsm_report/variant', () => {
  let record;
  let variant;
  let server;
  let request;

  beforeAll(async () => {
    const port = await getPort({port: CONFIG.get('web:port')});
    server = await listen(port);
    request = supertest(server);
  });

  afterAll(async () => {
    await server.close();
  });


  beforeEach(async () => {
    // Create a report through models to avoid using endpoints
    record = await db.models.germline_small_mutation.create({
      source_version: 'v1.0.0',
      source_path: '/some/random/source/path',
      biofx_assigned: 0,
      exported: false,
      patientId: 'TESTPAT01',
      biopsyName: 'TEST123',
    });

    // Create a Variant in the newly created report
    variant = await db.models.germline_small_mutation_variant.create({
      germline_report_id: record.id,
      gene: 'ARTBAN',
    });
  });

  afterEach(async () => {
    // Hard deletes both the record and the variant
    await db.models.germline_small_mutation.destroy({
      where: {ident: record.ident},
      force: true,
    });

    await db.models.germline_small_mutation_variant.destroy({
      where: {ident: variant.ident},
      force: true,
    });
  });

  describe('GET', () => {
    test('GET /{variant} - 200 Success', async () => {
      await request
        .get(`${BASE_URL}/patient/${record.patientId}/biopsy/${record.biopsyName}/report/${record.ident}/variant/${variant.ident}`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);
    });

    test('GET /{variant} - 404 Not Found', async () => {
      await request
        .get(`${BASE_URL}/patient/${record.patientId}/biopsy/${record.biopsyName}/report/${record.ident}/variant/NOT_A_EXISTING_VARIANT`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.NOT_FOUND);
    });
  });

  describe('PUT', () => {
    test('PUT /{variant} - 200 Success', async () => {
      const res = await request
        .put(`${BASE_URL}/patient/${record.patientId}/biopsy/${record.biopsyName}/report/${record.ident}/variant/${variant.ident}`)
        .send({patient_history: 'Patient_history', family_history: 'Family_history', hidden: true})
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      expect(res.body).toEqual(expect.objectContaining({
        patient_history: 'Patient_history',
        family_history: 'Family_history',
        hidden: true,
      }));
    });

    test('PUT /{variant} patient_history is required - 400 Bad Request', async () => {
      await request
        .put(`${BASE_URL}/patient/${record.patientId}/biopsy/${record.biopsyName}/report/${record.ident}/variant/${variant.ident}`)
        .send({family_history: 'Family_history', hidden: true})
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.BAD_REQUEST);
    });

    test('PUT /{variant} family_history is required - 400 Bad Request', async () => {
      await request
        .put(`${BASE_URL}/patient/${record.patientId}/biopsy/${record.biopsyName}/report/${record.ident}/variant/${variant.ident}`)
        .send({patient_history: 'Patient_history', hidden: true})
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.BAD_REQUEST);
    });

    test('PUT /{variant} hidden should be boolean - 400 Bad Request', async () => {
      await request
        .put(`${BASE_URL}/patient/${record.patientId}/biopsy/${record.biopsyName}/report/${record.ident}/variant/${variant.ident}`)
        .send({patient_history: 'Patient_history', family_history: 'Family_history', hidden: 'NOT_BOOLEAN'})
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.BAD_REQUEST);
    });

    test('PUT /{variant} - 404 Not Found', async () => {
      await request
        .put(`${BASE_URL}/patient/${record.patientId}/biopsy/${record.biopsyName}/report/${record.ident}/variant/NOT_A_EXISTING_VARIANT`)
        .send({patient_history: 'Patient_history', family_history: 'Family_history', hidden: true})
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.NOT_FOUND);
    });
  });
});
