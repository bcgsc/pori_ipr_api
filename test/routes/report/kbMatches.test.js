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
  'pmidRef', 'variantType', 'kbVariantId', 'kbStatementId', 'kbData', 'variant', 'inferred', 'reviewStatus'];

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
describe.skip('/reports/{REPORTID}/kb-matches', () => {
  let report;
  let gene;
  let variant;
  let kbMatch;
  let createData;

  beforeAll(async () => {
    // Get genomic template
    const template = await db.models.template.findOne({where: {name: 'genomic'}});
    // Create Report and kbMatch
    report = await db.models.analysis_report.create({
      templateId: template.id,
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

    createData = {
      reportId: report.id,
      variantId: variant.id,
      category: 'unknown',
      variantType: 'cnv',
    };

    kbMatch = await db.models.kbMatches.create(createData);
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

  describe('DELETE', () => {
    let kbMatchDelete;

    beforeEach(async () => {
      kbMatchDelete = await db.models.kbMatches.create(createData);
    });

    afterEach(async () => {
      if (kbMatchDelete) {
        await db.models.kbMatches.destroy({where: {ident: kbMatchDelete.ident}, force: true});
      }
    });

    test('/{kbMatch} - 204 Successful kbMatch delete', async () => {
      await request
        .delete(`/api/reports/${report.ident}/kb-matches/${kbMatchDelete.ident}`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.NO_CONTENT);

      // Verify it was deleted from db
      const results = await db.models.kbMatches.findAll({where: {ident: kbMatchDelete.ident}});
      expect(results.length).toBe(0);
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
