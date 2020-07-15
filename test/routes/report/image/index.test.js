const HTTP_STATUS = require('http-status-codes');
const supertest = require('supertest');
const getPort = require('get-port');
const db = require('../../../../app/models');

const CONFIG = require('../../../../app/config');
const {listen} = require('../../../../app');

CONFIG.set('env', 'test');
const {username, password} = CONFIG.get('testing');

let server;
let request;

// Start API
beforeAll(async () => {
  const port = await getPort({port: CONFIG.get('web:port')});
  server = await listen(port);
  request = supertest(server);
});

describe('/reports/{REPORTID}/image', () => {
  let report;

  beforeAll(async () => {
    // Create test report
    report = await db.models.analysis_report.create({
      type: 'genomic',
      patientId: 'PATIENT1234',
    });
  });

  describe('GET', () => {
    test.todo('All image GET tests');
  });

  describe('POST', () => {
    // Tests for POST endpoints
    test('POST / - 201 Created', async () => {
      const res = await request
        .post(`/api/reports/${report.ident}/image`)
        .attach('cnv.1', 'test/testData/images/golden.jpg')
        .auth(username, password)
        .expect(HTTP_STATUS.CREATED);

      // Check returned values match successful upload
      expect(res.body.message).toEqual('All images successfully uploaded!');
    });

    test.todo('All other POST tests');
  });

  // delete report
  afterAll(async () => {
    // delete newly created report and all of it's components
    // indirectly by hard deleting newly created patient
    await db.models.analysis_report.destroy({where: {ident: report.ident}, force: true});

    // verify report is deleted
    await request
      .get(`/api/reports/${report.ident}`)
      .auth(username, password)
      .type('json')
      .expect(HTTP_STATUS.NOT_FOUND);
  });
});

afterAll(async () => {
  await server.close();
});
