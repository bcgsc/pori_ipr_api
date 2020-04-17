const HTTP_STATUS = require('http-status-codes');
const supertest = require('supertest');
const getPort = require('get-port');

const db = require('../../app/models');
// get test user info
const CONFIG = require('../../app/config');
const {listen} = require('../../app');

// get credentials from the CONFIG
CONFIG.set('env', 'test');
const {username, password} = CONFIG.get('testing');

describe('/structural-variants', () => {
  let server;
  let request;
  let report;
  let variant;

  beforeAll(async () => {
    const port = await getPort({port: CONFIG.get('web:port')});
    server = await listen(port);
    request = supertest(server);

    // find a variant (any variant)
    variant = await db.models.structuralVariants.findOne({
      attributes: ['id', 'ident', 'reportId'],
      include: [
        {model: db.models.genes.scope('minimal'), foreignKey: 'gene1Id', as: 'gene1'},
        {model: db.models.genes.scope('minimal'), foreignKey: 'gene2Id', as: 'gene2'},
      ],
      where: {deletedAt: null},
    });

    expect(variant).toHaveProperty('id');
    expect(variant).toHaveProperty('ident');
    expect(variant).toHaveProperty('reportId');
    expect(variant).toHaveProperty('gene1');
    expect(variant).toHaveProperty('gene2');
    expect(typeof variant.gene1).toBe('object');
    expect(typeof variant.gene2).toBe('object');

    expect(variant.id).not.toBe(null);
    expect(variant.ident).not.toBe(null);
    expect(variant.reportId).not.toBe(null);

    // find report from variant
    // *Note: There shouldn't be an issue with finding
    // a deleted report because even on soft-delete
    // the variant should be soft-deleted too*
    report = await db.models.analysis_report.findOne({
      attributes: ['ident', 'id'],
      where: {id: variant.reportId, deletedAt: null},
    });

    expect(report).toHaveProperty('id');
    expect(report).toHaveProperty('ident');
    expect(report.id).not.toBe(null);
    expect(report.ident).not.toBe(null);
  });

  afterAll(async () => {
    await server.close();
  });

  describe('tests dependent on existing structural variants', () => {
    describe('GET', () => {
      test('all structural variants for a report', async () => {
        const {body: results} = await request
          .get(`/api/reports/${report.ident}/structural-variants`)
          .auth(username, password)
          .type('json')
          .expect(HTTP_STATUS.OK);
        expect(Array.isArray(results)).toBe(true);
        // verify all returned variants
        for (const result of results) {
          // have properties
          expect(result).toHaveProperty('ident');
          expect(result).toHaveProperty('gene1');
          expect(result).toHaveProperty('gene2');
          expect(typeof result.gene1).toBe('object');
          expect(typeof result.gene2).toBe('object');

          expect(result.gene1).toHaveProperty('expressionVariants');
          expect(result.gene1).toHaveProperty('copyVariants');
          expect(result.gene2).toHaveProperty('expressionVariants');
          expect(result.gene2).toHaveProperty('copyVariants');

          expect(result).toHaveProperty('kbMatches');
          expect(Array.isArray(result.kbMatches)).toBe(true);

          expect(result).not.toHaveProperty('id');
          expect(result).not.toHaveProperty('reportId');
          expect(result).not.toHaveProperty('gene1Id');
          expect(result).not.toHaveProperty('gene2Id');
          expect(result).not.toHaveProperty('deletedAt');
        }
      });

      test('a single structural variant by ident', async (done) => {
        const {body: result} = await request
          .get(`/api/reports/${report.ident}/structural-variants/${variant.ident}`)
          .auth(username, password)
          .type('json')
          .expect(HTTP_STATUS.OK);
        expect(result).toHaveProperty('ident', variant.ident);
        expect(result).toHaveProperty('gene1', variant.gene1.dataValues);
        expect(result).toHaveProperty('gene2', variant.gene2.dataValues);
        expect(typeof result.gene1).toBe('object');
        expect(typeof result.gene2).toBe('object');

        expect(result).not.toHaveProperty('kbMatches');
        expect(result.gene1).not.toHaveProperty('expressionVariants');
        expect(result.gene1).not.toHaveProperty('copyVariants');
        expect(result.gene2).not.toHaveProperty('expressionVariants');
        expect(result.gene2).not.toHaveProperty('copyVariants');

        expect(result).not.toHaveProperty('id');
        expect(result).not.toHaveProperty('reportId');
        expect(result).not.toHaveProperty('gene1Id');
        expect(result).not.toHaveProperty('gene2Id');
        expect(result).not.toHaveProperty('deletedAt');

        done();
      });
    });
  });
});
