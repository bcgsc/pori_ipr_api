const HTTP_STATUS = require('http-status-codes');
const supertest = require('supertest');
const getPort = require('get-port');

const db = require('../../../app/models');
// get test user info
const CONFIG = require('../../../app/config');
const {listen} = require('../../../app');

const mockData = require('../../testData/mockGermlineReportData.json');

// get credentials from the CONFIG
CONFIG.set('env', 'test');
const {username, password} = CONFIG.get('testing');

const BASE_URL = '/api/1.0/germline_small_mutation';


const checkGermlineReport = (res) => {
  expect(res.body).toEqual(expect.objectContaining({
    total: expect.any(Number),
    reports: expect.arrayContaining([
      expect.objectContaining({
        ident: expect.any(String),
        source_version: expect.any(String),
        source_path: expect.any(String),
        exported: expect.any(Boolean),
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
        id: expect.any(Number),
        biofx_assigned: expect.any(Object),
        projects: expect.any(Array),
        reviews: expect.any(Array),
        variants: expect.any(Array),
      }),
    ]),
  }));
};


describe('/germline_small_mutation', () => {
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


  describe('POST (create) /patient/:patient/biopsy/:biopsy', () => {
    // TODO: Add invalid input tests
    test('valid input - ok', async () => {
      const {body: record} = await request
        .post(`${BASE_URL}/patient/FAKE/biopsy/biop1`)
        .auth(username, password)
        .type('json')
        .send({...mockData})
        .expect(HTTP_STATUS.CREATED);
      expect(record).toHaveProperty('ident');

      // clean up the newly created report
      await db.models.germline_small_mutation.destroy({
        where: {ident: record.ident},
        force: true,
      });
    });
  });

  describe('GET', () => {
    test('GET / all reports - 200 success', async () => {
      const res = await request
        .get(BASE_URL)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      checkGermlineReport(res);
    });

    test('GET / all reports + search query - 200 success', async () => {
      const res = await request
        .get(BASE_URL)
        .query({search: 'POG'})
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);
  
      checkGermlineReport(res);
      // TODO: Implement specific check for checking if it actually searched
    });

    test('GET / all reports + not existing search query - 200 success', async () => {
      const res = await request
        .get(BASE_URL)
        .query({project: 'PROBABLY_THIS_IS_NOT_A_POG_ID'})
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      expect(res.body).toEqual(expect.objectContaining({
        total: 0,
        reports: expect.arrayContaining([]),
      }));
    });

    test('GET / all reports + project query - 200 success', async () => {
      const res = await request
        .get(BASE_URL)
        .query({search: 'POG'})
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      checkGermlineReport(res);
      expect(res.body.reports[0].projects[0].name).toEqual('POG');
    });

    test('GET / all reports + not existing project query - 200 success', async () => {
      const res = await request
        .get(BASE_URL)
        .query({project: 'PROBABLY_THIS_IS_NOT_A_VALID_PROJECT_NAME'})
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      expect(res.body).toEqual(expect.objectContaining({
        total: 0,
        reports: expect.arrayContaining([]),
      }));
    });

    test('GET / all reports + limit and offset - 200 success', async () => {
      const res = await request
        .get(BASE_URL)
        .query({limit: 3, offset: 5})
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      checkGermlineReport(res);
      expect(res.body.reports.length).toEqual(3);
    });
  });

  describe('tests dependent on existing report', () => {
    let record;

    beforeAll(async () => {
      record = await db.models.germline_small_mutation.create({
        source_version: 'vX.X.X',
        source_path: '/some/random/source/path',
        biofx_assigned: 0,
        exported: false,
        patientId: 'TESTPAT01',
        biopsyName: 'TEST123',
      });
    });

    describe('GET', () => {
      test('GET /patient/:patient/biopsy/:biopsy reports - 200 success', async () => {
        const res = await request
          .get(`${BASE_URL}/patient/${record.patientId}/biopsy/${record.biopsyName}`)
          .auth(username, password)
          .type('json')
          .expect(HTTP_STATUS.OK);

        expect(res.body).toEqual(expect.arrayContaining([
          expect.objectContaining({
            ident: expect.any(String),
            source_version: expect.any(String),
            source_path: expect.any(String),
            exported: expect.any(Boolean),
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
            id: expect.any(Number),
            biofx_assigned: expect.any(Object),
            projects: expect.any(Array),
            reviews: expect.any(Array),
            variants: expect.any(Array),
          }),
        ]));
      });
    });

    afterAll(async () => {
      await db.models.germline_small_mutation.destroy({
        where: {ident: record.ident},
        force: true,
      });
    });
  });
});
