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
    test('POST / - 207 Multi-Status successful', async () => {
      const res = await request
        .post(`/api/reports/${report.ident}/image`)
        .attach('cnv.1', 'test/testData/images/golden.jpg')
        .auth(username, password)
        .expect(HTTP_STATUS.MULTI_STATUS);

      // Check returned values match successful upload
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);

      const [result] = res.body;

      expect(result.key).toBe('cnv.1');
      expect(result.upload).toBe('successful');
      expect(result.error).toBe(undefined);
    });

    test('POST / - (With title and caption) 207 Multi-Status successful', async () => {
      const res = await request
        .post(`/api/reports/${report.ident}/image`)
        .attach('cnv.2', 'test/testData/images/golden.jpg')
        .field('cnv.2_title', 'Test title')
        .field('cnv.2_caption', 'Test caption')
        .auth(username, password)
        .expect(HTTP_STATUS.MULTI_STATUS);

      // Check returned values match successful upload
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);

      const [result] = res.body;

      expect(result.key).toBe('cnv.2');
      expect(result.upload).toBe('successful');
      expect(result.error).toBe(undefined);

      // Test that title and caption were added to db
      const imageData = await db.models.imageData.findOne({
        where: {
          reportId: report.id,
          key: 'cnv.2',
        },
      });

      expect(imageData).toEqual(expect.objectContaining({
        format: 'PNG',
        filename: 'golden.jpg',
        key: 'cnv.2',
        title: 'Test title',
        caption: 'Test caption',
      }));
    });

    test('POST / - 400 Bad Request invalid key', async () => {
      const res = await request
        .post(`/api/reports/${report.ident}/image`)
        .attach('INVALID_KEY', 'test/testData/images/golden.jpg')
        .auth(username, password)
        .expect(HTTP_STATUS.BAD_REQUEST);

      // Check invalid key error
      expect(res.body.error).toEqual(expect.objectContaining({
        message: 'Invalid key: INVALID_KEY',
      }));
    });

    test('POST / - 400 Bad Request duplicate key', async () => {
      const res = await request
        .post(`/api/reports/${report.ident}/image`)
        .attach('cnv.1', 'test/testData/images/golden.jpg')
        .attach('cnv.1 ', 'test/testData/images/golden.jpg')
        .auth(username, password)
        .expect(HTTP_STATUS.BAD_REQUEST);

      // Check duplicate key error
      expect(res.body.error).toEqual(expect.objectContaining({
        message: 'Duplicate keys are not allowed. Duplicate key: cnv.1',
      }));
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
