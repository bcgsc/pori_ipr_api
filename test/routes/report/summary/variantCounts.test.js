const HTTP_STATUS = require('http-status-codes');
const supertest = require('supertest');
const getPort = require('get-port');
const db = require('../../../../app/models');

const CONFIG = require('../../../../app/config');
const {listen} = require('../../../../app');

CONFIG.set('env', 'test');
const {username, password} = CONFIG.get('testing');

// Data for variant counts create
const CREATE_DATA = {
  smallMutations: 23,
  CNVs: 56,
  SVs: 12,
  expressionOutliers: 77,
};

// Data for variant counts update
const UPDATE_DATA = {
  smallMutations: 12,
  CNVs: 656,
  SVs: 98,
  expressionOutliers: 5,
};

// Validate that the output contains all variantCounts properties
// and doesn't have any of the excluded properties
const validateOutput = (body) => {
  expect(body).toEqual(expect.objectContaining({
    ident: expect.any(String),
    smallMutations: expect.any(Number),
    CNVs: expect.any(Number),
    SVs: expect.any(Number),
    expressionOutliers: expect.any(Number),
    variantsUnknown: expect.any(Number),
    createdAt: expect.any(String),
    updatedAt: expect.any(String),
  }));

  expect(body).toEqual(expect.not.objectContaining({
    id: expect.any(Number),
    reportId: expect.any(Number),
    deletedAt: expect.any(String),
  }));
};

let server;
let request;

// Start API
beforeAll(async () => {
  const port = await getPort({port: CONFIG.get('web:port')});
  server = await listen(port);
  request = supertest(server);
});

describe('/reports/{REPORTID}/summary/variant-counts', () => {
  let report;

  beforeAll(async () => {
    // Get genomic template
    const template = await db.models.template.findOne({where: {name: 'genomic'}});
    // Create test report
    report = await db.models.report.create({
      templateId: template.id,
      patientId: 'PATIENT1234',
    });

    // Create test variant counts
    await db.models.variantCounts.create({
      ...CREATE_DATA,
      reportId: report.id,
    });
  });

  describe('GET', () => {
    test('GET / - 200 Success', async () => {
      // Test GET endpoint
      const res = await request
        .get(`/api/reports/${report.ident}/summary/variant-counts`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      validateOutput(res.body);

      // Check returned values match the create data
      expect(res.body).toEqual(expect.objectContaining(CREATE_DATA));
    });
  });

  describe('PUT', () => {
    // Tests for PUT endpoints
    test('PUT / - 200 Success', async () => {
      const res = await request
        .put(`/api/reports/${report.ident}/summary/variant-counts`)
        .send(UPDATE_DATA)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      validateOutput(res.body);

      // Check returned values match the update data
      expect(res.body).toEqual(expect.objectContaining(UPDATE_DATA));
    });
  });

  afterAll(async () => {
    // Delete newly created report and all of it's components
    // indirectly by force deleting the report
    return db.models.report.destroy({where: {ident: report.ident}, force: true});
  });
});

afterAll(async () => {
  global.gc && global.gc();
  await server.close();
});
