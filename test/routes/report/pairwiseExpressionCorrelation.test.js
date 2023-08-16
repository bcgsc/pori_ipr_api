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

const checkCorrelation = (correlation) => {
  [
    'patientId',
    'library',
    'correlation',
    'tumourType',
    'tissueType',
    'tumourContent',
    'ident',
  ].forEach((attr) => {
    expect(correlation).toHaveProperty(attr);
  });

  expect(correlation).not.toHaveProperty('id');
  expect(correlation).not.toHaveProperty('reportId');
  expect(correlation).not.toHaveProperty('deletedAt');
};

describe('/reports/{REPORTID}/pairwise-expression-correlation', () => {
  let report;

  beforeAll(async () => {
    // Get genomic template
    const template = await db.models.template.findOne({where: {name: 'genomic'}});
    // Create Report and discussion
    report = await db.models.report.create({
      templateId: template.id,
      patientId: mockReportData.patientId,
    });
    await db.models.pairwiseExpressionCorrelation.create({
      patientId: 'UPLOADPAT02',
      library: 'LIB0002',
      correlation: 0.99,
      tumourType: 'pancreatic cancer',
      tissueType: 'liver',
      tumourContent: 15,
      reportId: report.id,
    });
  }, LONGER_TIMEOUT);

  describe('GET', () => {
    test('Getting a list of correlations is ok', async () => {
      const res = await request
        .get(`/api/reports/${report.ident}/pairwise-expression-correlation`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      res.body.forEach((corr) => {
        return checkCorrelation(corr);
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
