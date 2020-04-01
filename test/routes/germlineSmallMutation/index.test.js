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

const BASE_URL = '/api/germline-small-mutation-reports';

// Template of a germline report for testing
const checkGermlineReport = expect.objectContaining({
  ident: expect.any(String),
  source_version: expect.any(String),
  source_path: expect.any(String),
  exported: expect.any(Boolean),
  createdAt: expect.any(String),
  updatedAt: expect.any(String),
  biofx_assigned: expect.any(Object),
  projects: expect.any(Array),
  reviews: expect.any(Array),
  variants: expect.any(Array),
});

// Template of a GET all reports query for tests
const checkGermlineReportList = expect.objectContaining({
  total: expect.any(Number),
  reports: expect.arrayContaining([
    checkGermlineReport,
  ]),
});


describe('/germline-small-mutation-reports', () => {
  // TODO:Add checks to ensure is not returning id
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
    test('POST /patient/:patient/biopsy/:biopsy - 201 Created', async () => {
      const {body: record} = await request
        .post(`${BASE_URL}`)
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

    test('POST /patient/:patient/biopsy/:biopsy version is required - 400 Bad Request', async () => {
      await request
        .post(`${BASE_URL}/patient/FAKE/biopsy/biop1`)
        .auth(username, password)
        .type('json')
        .send({
          normal_library: 'P0XXXXX',
          project: 'TEST',
          rows: [{}],
          source: '/some/file/path',
        })
        .expect(HTTP_STATUS.BAD_REQUEST);
    });

    test('POST /patient/:patient/biopsy/:biopsy source is required - 400 Bad Request', async () => {
      await request
        .post(`${BASE_URL}/patient/FAKE/biopsy/biop1`)
        .auth(username, password)
        .type('json')
        .send({
          normal_library: 'P0XXXXX',
          project: 'TEST',
          rows: [{}],
          version: 'vX.X.X',
        })
        .expect(HTTP_STATUS.BAD_REQUEST);
    });

    test('POST /patient/:patient/biopsy/:biopsy project is required - 400 Bad Request', async () => {
      await request
        .post(`${BASE_URL}/patient/FAKE/biopsy/biop1`)
        .auth(username, password)
        .type('json')
        .send({
          normal_library: 'P0XXXXX',
          rows: [{}],
          source: '/some/file/path',
          version: 'vX.X.X',
        })
        .expect(HTTP_STATUS.BAD_REQUEST);
    });

    test('POST /patient/:patient/biopsy/:biopsy normal_library is required - 400 Bad Request', async () => {
      await request
        .post(`${BASE_URL}/patient/FAKE/biopsy/biop1`)
        .auth(username, password)
        .type('json')
        .send({
          project: 'TEST',
          rows: [{}],
          source: '/some/file/path',
          version: 'vX.X.X',
        })
        .expect(HTTP_STATUS.BAD_REQUEST);
    });
  });

  describe('GET', () => {
    test('GET / all reports - 200 success', async () => {
      const res = await request
        .get(BASE_URL)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      expect(res.body).toEqual(checkGermlineReportList);
    });

    test('GET / all reports + search query - 200 success', async () => {
      const res = await request
        .get(BASE_URL)
        .query({search: 'POG'})
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      expect(res.body).toEqual(checkGermlineReportList);
      expect(res.body.reports).toEqual(expect.arrayContaining([
        expect.objectContaining({patientId: expect.stringContaining('POG')}),
      ]));
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

      expect(res.body).toEqual(checkGermlineReportList);
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

      expect(res.body).toEqual(checkGermlineReportList);
      expect(res.body.reports.length).toEqual(3);
    });
  });

  describe('tests dependent on existing report', () => {
    let record;

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
    });

    afterEach(async () => {
      // Hard delete recent created report
      await db.models.germline_small_mutation.destroy({
        where: {ident: record.ident},
        force: true,
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
          checkGermlineReport,
        ]));
      });

      test('GET /patient/:patient/biopsy/:analysis/report/:gsm_report - 200 success', async () => {
        const res = await request
          .get(`${BASE_URL}/patient/${record.patientId}/biopsy/${record.biopsyName}/report/${record.ident}`)
          .auth(username, password)
          .type('json')
          .expect(HTTP_STATUS.OK);

        expect(res.body).toEqual(
          checkGermlineReport,
        );
      });
    });

    describe('PUT', () => {
      test('PUT /patient/:patient/biopsy/:analysis/report/:gsm_report - 200 Success', async () => {
        const NEW_EXPORTED = true;
        const res = await request
          .put(`${BASE_URL}/patient/${record.patientId}/biopsy/${record.biopsyName}/report/${record.ident}`)
          .send({exported: NEW_EXPORTED})
          .auth(username, password)
          .type('json')
          .expect(HTTP_STATUS.OK);

        expect(res.body.exported).toBe(NEW_EXPORTED);
      });

      test('PUT /patient/:patient/biopsy/:analysis/report/:gsm_report - 404 Not Found', async () => {
        const NEW_EXPORTED = true;
        await request
          .put(`${BASE_URL}/patient/${record.patientId}/biopsy/${record.biopsyName}/report/NOT_A_EXISTING_RECORD`)
          .send({exported: NEW_EXPORTED})
          .auth(username, password)
          .type('json')
          .expect(HTTP_STATUS.NOT_FOUND);
      });
    });

    describe('DELETE', () => {
      test('DELETE /patient/:patient/biopsy/:analysis/report/:gsm_report - 204 Success', async () => {
        await request
          .delete(`${BASE_URL}/patient/${record.patientId}/biopsy/${record.biopsyName}/report/${record.ident}`)
          .auth(username, password)
          .type('json')
          .expect(HTTP_STATUS.NO_CONTENT);
      });

      test('DELETE /patient/:patient/biopsy/:analysis/report/:gsm_report - 404 Not Found', async () => {
        await request
          .delete(`${BASE_URL}/patient/${record.patientId}/biopsy/${record.biopsyName}/report/NOT_AN_EXISTING_RECORD`)
          .auth(username, password)
          .type('json')
          .expect(HTTP_STATUS.NOT_FOUND);
      });
    });
  });
});
