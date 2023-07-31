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

const checkComparator = (comp) => {
  const comparatorSchema = {
    ident: expect.any(String),
    createdAt: expect.any(String),
    updatedAt: expect.any(String),
    name: expect.any(String),
    analysisRole: expect.any(String),
  };
  expect(comp).toEqual(expect.objectContaining(comparatorSchema));
  expect(comp).toHaveProperty('description');
  expect(comp).toHaveProperty('size');
  expect(comp).toHaveProperty('size');
};

describe('/reports/{REPORTID}/comparators', () => {
  let report;

  beforeAll(async () => {
    // Get genomic template
    const template = await db.models.template.findOne({where: {name: 'genomic'}});
    // Create Report and discussion
    report = await db.models.report.create({
      templateId: template.id,
      patientId: mockReportData.patientId,
    });
    await db.models.comparators.create({
      reportId: report.id,
      name: 'COADREAD',
      analysisRole: 'expression (disease)',
    });
    await db.models.comparators.create({
      reportId: report.id,
      name: 'pog_internal_cohort',
      analysisRole: 'expression (internal pancancer cohort)',
    });
  }, LONGER_TIMEOUT);

  describe('GET', () => {
    test('Getting a list of comparators is ok', async () => {
      const res = await request
        .get(`/api/reports/${report.ident}/comparators`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      res.body.forEach((comp) => {
        checkComparator(comp);
      });
    });
  });

  // delete report
  afterAll(async () => {
    await db.models.report.destroy({where: {id: report.id}, force: true});
  }, LONGER_TIMEOUT);
});

afterAll(async () => {
  global.gc && global.gc();
  await server.close();
});
