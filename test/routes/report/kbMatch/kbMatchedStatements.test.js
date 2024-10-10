const HTTP_STATUS = require('http-status-codes');

const supertest = require('supertest');
const getPort = require('get-port');
const db = require('../../../../app/models');

const mockReportData = require('../../../testData/mockReportData.json');

const CONFIG = require('../../../../app/config');
const {listen} = require('../../../../app');

CONFIG.set('env', 'test');

const {username, password} = CONFIG.get('testing');

const LONGER_TIMEOUT = 100000;

let server;
let request;

const kbMatchedStatementProperties = [
  'ident', 'createdAt', 'updatedAt', 'category', 'approvedTherapy',
  'disease', 'relevance', 'context', 'status', 'reference', 'sample',
  'evidenceLevel', 'iprEvidenceLevel', 'matchedCancer', 'pmidRef',
  'kbStatementId', 'kbData', 'externalSource', 'externalStatementId',
  'reviewStatus',
];

const checkStatement = (kbMatchedStatementObject) => {
  kbMatchedStatementProperties.forEach((element) => {
    expect(kbMatchedStatementObject).toHaveProperty(element);
  });
};

// Start API
beforeAll(async () => {
  const port = await getPort({port: CONFIG.get('web:port')});
  server = await listen(port);
  request = supertest(server);
});

// Tests for /kb-matches endpoint
describe('/reports/{REPORTID}/kb-matches/{KBMATCHID}/kb-matched-statements', () => {
  let report;
  let gene;
  let variant;
  let kbMatch;
  let createData;
  let createDataStatement;
  let createDataStatementFiltering;
  let statement;
  let statementFiltering;

  beforeAll(async () => {
    // Get genomic template
    const template = await db.models.template.findOne({where: {name: 'genomic'}});
    // Create Report and kbMatch
    report = await db.models.report.create({
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
      variantType: 'cnv',
    };

    kbMatch = await db.models.kbMatches.create(createData);

    createDataStatement = {
      reportId: report.id,
      category: 'unknown',
      iprEvidenceLevel: 'IPR-A',
    };

    createDataStatementFiltering = {
      reportId: report.id,
      category: 'unknown',
      iprEvidenceLevel: 'IPR-B',
    };

    statement = await db.models.kbMatchedStatements.create(createDataStatement);
    statementFiltering = await db.models.kbMatchedStatements.create(createDataStatementFiltering);

    await db.models.kbMatchJoin.create({kbMatchId: kbMatch.id, kbMatchedStatementId: statement.id});
    await db.models.kbMatchJoin.create({kbMatchId: kbMatch.id, kbMatchedStatementId: statementFiltering.id});
  }, LONGER_TIMEOUT);

  describe('GET', () => {
    test('Getting all kb-matches is ok', async () => {
      const res = await request
        .get(`/api/reports/${report.ident}/kb-matches/${kbMatch.ident}/kb-matched-statements`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      expect(Array.isArray(res.body)).toBe(true);
      checkStatement(res.body[0]);
    });

    test('Filtering kb-matched-statements is ok', async () => {
      // Fix this
      const res = await request
        .get(`/api/reports/${report.ident}/kb-matches/${kbMatch.ident}/kb-matched-statements`)
        .query({iprEvidenceLevel: 'IPR-A,IPR-C'})
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      expect(Array.isArray(res.body)).toBe(true);
      checkStatement(res.body[0]);
      res.body.every((match) => {return expect(match.iprEvidenceLevel).toEqual('IPR-A');});
    });

    test('Getting a specific kb-matched-statement is ok', async () => {
      const res = await request
        .get(`/api/reports/${report.ident}/kb-matches/${kbMatch.ident}/kb-matched-statements/${statement.ident}`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      checkStatement(res.body);
    });
  });

  describe('DELETE', () => {
    let statementDelete;

    beforeEach(async () => {
      statementDelete = await db.models.kbMatchedStatements.create(createDataStatement);
      await db.models.kbMatchJoin.create({kbMatchId: kbMatch.id, kbMatchedStatementId: statementDelete.id});
    });

    afterEach(async () => {
      if (statementDelete) {
        await db.models.kbMatchedStatements.destroy({where: {ident: statementDelete.ident}});
      }
    });

    test('/{kbMatchedStatements} - 204 Successful statement delete', async () => {
      await request
        .delete(`/api/reports/${report.ident}/kb-matches/${kbMatch.ident}/kb-matched-statements/${statementDelete.ident}`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.NO_CONTENT);

      // Verify it was deleted from db
      const results = await db.models.kbMatchJoin.findAll({where: {kbMatchId: kbMatch.id, kbMatchedStatementId: statementDelete.id}});
      expect(results.length).toBe(0);
    });
  });

  // delete report
  afterAll(async () => {
    await db.models.report.destroy({where: {id: report.id}});
  }, LONGER_TIMEOUT);
});

afterAll(async () => {
  global.gc && global.gc();
  await server.close();
});
