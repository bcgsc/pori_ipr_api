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

const kbMatchProperties = ['ident', 'createdAt', 'updatedAt', 'category', 'approvedTherapy', 'kbVariant', 'disease', 'relevance', 'context', 'status', 'reference', 'sample', 'evidenceLevel', 'matchedCancer',
  'pmidRef', 'variantType', 'kbVariantId', 'kbStatementId', 'kbData', 'variant', 'inferred'];

const checkKbMatch = (kbMatchObject) => {
  kbMatchProperties.forEach((element) => {
    expect(kbMatchObject).toHaveProperty(element);
  });
  expect(kbMatchObject.variant).toHaveProperty('ident');
};

// Start API
beforeAll(async () => {
  const port = await getPort({port: CONFIG.get('web:port')});
  server = await listen(port);
  request = supertest(server);
});

// Tests for /kb-matches endpoint
describe('/reports/{REPORTID}/kb-matches', () => {
  let report;
  let gene;
  let variant;
  let kbMatch;

  beforeAll(async () => {
    // Create Report and kbMatch
    report = await db.models.analysis_report.create({
      patientId: mockReportData.patientId,
    });
    gene = await db.models.genes.create({
      reportId: report.id,
      name: mockReportData.genes[0].name,
    });
    variant = await db.models.copyVariants.create({
      reportId: report.id,
      geneId: gene.id,
    });
    kbMatch = await db.models.kbMatches.create({
      reportId: report.id,
      variantId: variant.id,
      category: 'unknown',
      variantType: 'cnv',
    });
  }, LONGER_TIMEOUT);

  describe('GET', () => {
    test('Getting all kb-matches is ok', async () => {
      const res = await request
        .get(`/api/reports/${report.ident}/kb-matches`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      expect(Array.isArray(res.body)).toBe(true);
      checkKbMatch(res.body[0]);
    });

    test('Getting a specific kb-match is ok', async () => {
      const res = await request
        .get(`/api/reports/${report.ident}/kb-matches/${kbMatch.ident}`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      checkKbMatch(res.body);
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
