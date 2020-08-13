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

const checkHlaType = (correlation) => {
  [
    'pathology',
    'protocol',
    'a1',
    'a2',
    'b1',
    'b2',
    'c1',
    'c2',
  ].forEach((attr) => {
    expect(correlation).toHaveProperty(attr);
  });

  expect(correlation).not.toHaveProperty('id');
  expect(correlation).not.toHaveProperty('reportId');
  expect(correlation).not.toHaveProperty('deletedAt');
};


describe('/reports/{REPORTID}/hla-types', () => {
  let report;
  let hlaType;

  beforeAll(async () => {
    report = await db.models.analysis_report.create({
      patientId: mockReportData.patientId,
    });
    hlaType = await db.models.hlaTypes.create({
      reportId: report.id,
      pathology: 'normal',
      protocol: 'DNA',
      a1: 'A*02:03',
      a2: 'A*11:01',
      b1: 'B*40:01',
      b2: 'B*38:02',
      c1: 'C*07:02',
      c2: 'C*07:02',
    });
  }, LONGER_TIMEOUT);

  describe('GET', () => {
    test('fetches existing hlaTypes ok', async () => {
      const res = await request
        .get(`/api/reports/${report.ident}/hla-types`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      expect(res.body.length).toEqual(1);
      res.body.forEach(checkHlaType);
    });

    test('Getting a specific hlaType is ok', async () => {
      const res = await request
        .get(`/api/reports/${report.ident}/hla-types/${hlaType.ident}`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      checkHlaType(res.body);
    });
  });

  describe('POST', () => {
    test('Creating a new valid hlaType is ok', async () => {
      const res = await request
        .post(`/api/reports/${report.ident}/hla-types`)
        .send({
          pathology: 'diseased',
          protocol: 'RNA',
          a1: 'A*02:03',
          a2: 'A*11:01',
          b1: 'B*40:01',
          b2: 'B*38:02',
          c1: 'C*07:02',
          c2: 'C*07:02',
        })
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.CREATED);

      checkHlaType(res.body);
      expect(res.body).toHaveProperty('pathology', 'diseased');
    });

    test('Creating a new hlaType should not accept additional properties', async () => {
      await request
        .post(`/api/reports/${report.ident}/hla-types`)
        .send({
          random: 'something kind of random',
          pathology: 'diseased',
          protocol: 'RNA',
          a1: 'A*02:03',
          a2: 'A*11:01',
          b1: 'B*40:01',
          b2: 'B*38:02',
          c1: 'C*07:02',
          c2: 'C*07:02',
        })
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.BAD_REQUEST);
    });
  });

  describe('PUT', () => {
    test('Updating a hlaType is ok', async () => {
      const res = await request
        .put(`/api/reports/${report.ident}/hla-types/${hlaType.ident}`)
        .send({
          pathology: 'diseased',
          protocol: 'RNA',
          a1: 'A*02:03',
          a2: 'A*11:01',
          b1: 'B*40:01',
          b2: 'B*38:02',
          c1: 'C*07:02',
          c2: 'C*07:02',
        })
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      checkHlaType(res.body);
      expect(res.body).toHaveProperty('pathology', 'diseased');
    });

    test('Updating a hlaType should not accept reportId', async () => {
      await request
        .put(`/api/reports/${report.ident}/hla-types/${hlaType.ident}`)
        .send({
          pathology: 'diseased',
          protocol: 'RNA',
          a1: 'A*02:03',
          a2: 'A*11:01',
          b1: 'B*40:01',
          b2: 'B*38:02',
          c1: 'C*07:02',
          c2: 'C*07:02',
          reportId: report.id,
        })
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.BAD_REQUEST);
    });
  });

  describe('DELETE', () => {
    test('Deleting a hlaType is ok', async () => {
      const deleteHlaType = await db.models.hlaTypes.create({
        pathology: 'diseased',
        protocol: 'RNA',
        a1: 'A*02:03',
        a2: 'A*11:01',
        b1: 'B*40:01',
        b2: 'B*38:02',
        c1: 'C*07:02',
        c2: 'C*07:02',
        reportId: report.id,
      });

      await request
        .delete(`/api/reports/${report.ident}/hla-types/${deleteHlaType.ident}`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.NO_CONTENT);

      expect(
        await db.models.hlaTypes.findOne({
          where: {ident: deleteHlaType.ident},
        })
      ).toBe(null);
    });
  });

  // delete report
  afterAll(async () => {
    await db.models.analysis_report.destroy({where: {id: report.id}, force: true});
  }, LONGER_TIMEOUT);
});


afterAll(async () => {
  await server.close();
});
