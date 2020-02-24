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


describe('/germline_small_mutation/patient/:patient/biopsy/:analysis/report/:gsm_report/review', () => {
  let record;
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
    record = await db.models.germline_small_mutation.create({
      source_version: 'v1.0.0',
      source_path: '/some/random/source/path',
      biofx_assigned: 0,
      exported: false,
      patientId: 'TESTPAT01',
      biopsyName: 'TEST123',
    });
  });

  afterEach(async () => {
    await db.models.germline_small_mutation.destroy({
      where: {ident: record.ident},
      force: true,
    });
  });

  describe('PUT', () => {
    test('PUT / - 200 Success', async () => {
      const res = await request
        .put(`${BASE_URL}/patient/${record.patientId}/biopsy/${record.biopsyName}/report/${record.ident}/review`)
        .send({type: 'test_type', comment: 'This is an example of a comment'})
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      expect(res.body).toEqual(expect.arrayContaining([
        expect.objectContaining({
          ident: expect.any(String),
          type: expect.any(String),
          comment: expect.any(String),
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
          reviewedBy: expect.any(Object),
        }),
      ]));
    });

    test('PUT / type is required - 400 Bad Request', async () => {
      await request
        .put(`${BASE_URL}/patient/${record.patientId}/biopsy/${record.biopsyName}/report/${record.ident}/review`)
        .send({})
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.BAD_REQUEST);
    });

    test('PUT / report is already reviewed - 400 Bad Request', async () => {
      await request
        .put(`${BASE_URL}/patient/${record.patientId}/biopsy/${record.biopsyName}/report/${record.ident}/review`)
        .send({type: 'test_type'})
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      await request
        .put(`${BASE_URL}/patient/${record.patientId}/biopsy/${record.biopsyName}/report/${record.ident}/review`)
        .send({type: 'test_type'})
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.BAD_REQUEST);
    });
  });

  describe('DELETE', () => {
    let review;

    beforeEach(async () => {
      review = await db.models.germline_small_mutation_review.create({
        germline_report_id: record.id,
        reviewedBy_id: 1,
        type: 'test_type',
        comment: 'This is an example of a comment',
      });
    });

    afterEach(async () => {
      await db.models.germline_small_mutation_review.destroy({
        where: {ident: review.ident},
        force: true,
      });
    });

    test('DELETE /{review} - 200 Success', async () => {
      // TODO: Fix this test
      const test = await request
        .delete(`${BASE_URL}/patient/${record.patientId}/biopsy/${record.biopsyName}/report/${record.ident}/review/${review.ident}`)
        .auth(username, password)
        .type('json');
      console.log(test.body);
    });
  });
});
