const getPort = require('get-port');
const supertest = require('supertest');
const HTTP_STATUS = require('http-status-codes');

const db = require('../../../app/models');
// get test user info
const CONFIG = require('../../../app/config');
const {listen} = require('../../../app');

CONFIG.set('env', 'test');
const {username, password} = CONFIG.get('testing');

const MAVIS_DATA = {
  product_id: 'TEST PRODUCT ID',
  summary: {},
};

const mavisProperties = [
  'ident', 'createdAt', 'summary',
];

const checkMavisSummary = (mavisObject) => {
  mavisProperties.forEach((element) => {
    expect(mavisObject).toHaveProperty(element);
  });
  expect(mavisObject).toEqual(expect.not.objectContaining({
    id: expect.any(Number),
    product_id: expect.any(String),
    reportId: expect.any(Number),
    updatedBy: expect.any(Number),
    deletedAt: expect.any(String),
  }));
};

const checkMavisSummaries = (summaries) => {
  summaries.forEach((summary) => {
    checkMavisSummary(summary);
  });
};

let server;
let request;

// Start API
beforeAll(async () => {
  const port = await getPort({port: CONFIG.get('web:port')});
  server = await listen(port);
  request = supertest(server);
});

describe('/reports/{report}/mavis', () => {
  let report;

  beforeAll(async () => {
    // Get genomic template
    const template = await db.models.template.findOne({where: {name: 'genomic'}});
    // Create report
    report = await db.models.report.create({
      templateId: template.id,
      patientId: 'PROBE_TEST_PATIENT',
    });
  });

  afterAll(async () => {
    return report.destroy({force: true});
  });

  describe('GET', () => {
    let getMavis;

    beforeEach(async () => {
      getMavis = await db.models.mavis.create({
        ...MAVIS_DATA, reportId: report.id,
      });
    });

    afterEach(async () => {
      return db.models.mavis.destroy({
        where: {ident: getMavis.ident},
        force: true,
      });
    });

    test('/ - 200 Success', async () => {
      const res = await request
        .get(`/api/reports/${report.ident}/mavis`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      checkMavisSummaries(res.body);
    });
  });
});

afterAll(async () => {
  global.gc && global.gc();
  await server.close();
});
