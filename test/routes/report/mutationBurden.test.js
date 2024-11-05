const HTTP_STATUS = require('http-status-codes');

const {v4: uuidv4} = require('uuid');
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

const mutationBurdenProperties = [
  'ident', 'createdAt', 'updatedAt', 'role', 'codingSnvCount', 'truncatingSnvCount',
  'codingIndelsCount', 'frameshiftIndelsCount', 'qualitySvCount', 'qualitySvExpressedCount',
  'codingSnvPercentile', 'codingIndelPercentile', 'qualitySvPercentile',
  'totalSnvCount', 'totalIndelCount', 'totalMutationsPerMb', 'svBurdenHidden',
];

const checkMutationBurden = (mutationObject) => {
  mutationBurdenProperties.forEach((element) => {
    expect(mutationObject).toHaveProperty(element);
  });
  expect(mutationObject).toEqual(expect.not.objectContaining({
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

// Tests for /mutationBurden endpoint
describe('/reports/{REPORTID}/mutation-burden', () => {
  const randomUuid = uuidv4();

  let report;
  let mutationBurden;

  beforeEach(async () => {
    // Get genomic template
    const template = await db.models.template.findOne({where: {name: 'genomic'}});
    // Create Report and Mutation Burden
    report = await db.models.report.create({
      templateId: template.id,
      patientId: mockReportData.patientId,
    });

    mutationBurden = await db.models.mutationBurden.create({
      reportId: report.id,
      role: 'primary',
      codingSnvCount: 13,
    });
  }, LONGER_TIMEOUT);

  describe('GET', () => {
    test('Getting a list of mutation burden records is OK', async () => {
      const res = await request
        .get(`/api/reports/${report.ident}/mutation-burden`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      expect(Array.isArray(res.body)).toBe(true);
      res.body.forEach((burden) => {
        return checkMutationBurden(burden);
      });
    });

    test('fetches known ident ok', async () => {
      const res = await request
        .get(`/api/reports/${report.ident}/mutation-burden/${mutationBurden.ident}`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      checkMutationBurden(res.body);
    });

    test('error on non-existant ident', async () => {
      await request
        .get(`/api/reports/${report.ident}/mutation-burden/${randomUuid}`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.NOT_FOUND);
    });
  });

  describe('POST', () => {
    test('/ - 201 successful create', async () => {
      const createData = {
        ...mockReportData.mutationBurden[0],
        role: 'secondary',
      };
      const res = await request
        .post(`/api/reports/${report.ident}/mutation-burden`)
        .auth(username, password)
        .type('json')
        .send(createData)
        .expect(HTTP_STATUS.CREATED);

      checkMutationBurden(res.body);
      expect(res.body).toEqual(expect.objectContaining(createData));
    });

    test('/ - 400 bad create request (report id included)', async () => {
      await request
        .post(`/api/reports/${report.ident}/mutation-burden`)
        .auth(username, password)
        .type('json')
        .send({
          ...mockReportData.mutationBurden[0],
          role: 'secondary',
          reportId: report.id,
        })
        .expect(HTTP_STATUS.BAD_REQUEST);
    });
  });

  describe('PUT', () => {
    test('valid update is OK', async () => {
      const res = await request
        .put(`/api/reports/${report.ident}/mutation-burden/${mutationBurden.ident}`)
        .auth(username, password)
        .type('json')
        .send({
          codingSnvCount: 4678,
        })
        .expect(HTTP_STATUS.OK);

      checkMutationBurden(res.body);
      expect(res.body).toHaveProperty('codingSnvCount', 4678);
    });

    test('error on unexpected value', async () => {
      await request
        .put(`/api/reports/${report.ident}/mutation-burden/${mutationBurden.ident}`)
        .auth(username, password)
        .type('json')
        .send({
          comparator: 'SYTHR',
        })
        .expect(HTTP_STATUS.BAD_REQUEST);
    });
  });

  describe('DELETE', () => {
    let mutationBurdenDelete;

    beforeEach(async () => {
      mutationBurdenDelete = await db.models.mutationBurden.create({
        ...mockReportData.mutationBurden[0],
        role: 'secondary',
        reportId: report.id,
      });
    }, LONGER_TIMEOUT);

    afterEach(async () => {
      if (mutationBurdenDelete) {
        await db.models.mutationBurden.destroy({
          where: {ident: mutationBurdenDelete.ident},
          force: true,
        });
      }
    });

    test('/{mutationBurden} - 204 Successful mutationBurden delete', async () => {
      await request
        .delete(`/api/reports/${report.ident}/mutation-burden/${mutationBurdenDelete.ident}`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.NO_CONTENT);

      // Verify it was deleted from db
      const results = await db.models.mutationBurden.findAll({
        where: {ident: mutationBurdenDelete.ident},
      });
      expect(results.length).toBe(0);
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
