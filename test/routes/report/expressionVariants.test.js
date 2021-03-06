const HTTP_STATUS = require('http-status-codes');
const supertest = require('supertest');
const getPort = require('get-port');

const db = require('../../../app/models');
// get test user info
const CONFIG = require('../../../app/config');
const {listen} = require('../../../app');

// get credentials from the CONFIG
CONFIG.set('env', 'test');
const {username, password} = CONFIG.get('testing');

let server;
let request;

beforeAll(async () => {
  const port = await getPort({port: CONFIG.get('web:port')});
  server = await listen(port);
  request = supertest(server);
});

describe('/expression-variants', () => {
  let report;
  let variant;

  beforeAll(async () => {
    // find a variant (any variant)
    variant = await db.models.expressionVariants.findOne({
      attributes: ['id', 'ident', 'reportId'],
      include: [
        {model: db.models.genes.scope('minimal'), as: 'gene'},
        {
          model: db.models.analysis_report,
          as: 'report',
          attributes: ['ident', 'id'],
          required: true,
        },
      ],
      where: {deletedAt: null},
    });

    expect(variant).toHaveProperty('id');
    expect(variant).toHaveProperty('ident');
    expect(variant).toHaveProperty('reportId');
    expect(variant).toHaveProperty('gene');
    expect(typeof variant.gene).toBe('object');

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

  describe('tests dependent on existing expression variants', () => {
    describe('GET', () => {
      test('all expression variants for a report', async () => {
        let {body: results} = await request
          .get(`/api/reports/${report.ident}/expression-variants`)
          .auth(username, password)
          .type('json')
          .expect(HTTP_STATUS.OK);
        expect(Array.isArray(results)).toBe(true);

        // make sure results is 5 entries or less
        results = results.slice(0, 5);

        // verify all returned variants
        for (const result of results) {
          expect(result).toHaveProperty('ident');
          expect(result).toHaveProperty('gene');
          expect(typeof result.gene).toBe('object');

          expect(result.gene).toHaveProperty('copyVariants');
          expect(result.gene).not.toHaveProperty('expressionVariants');

          expect(result).toHaveProperty('kbMatches');
          expect(Array.isArray(result.kbMatches)).toBe(true);

          expect(result).not.toHaveProperty('id');
          expect(result).not.toHaveProperty('reportId');
          expect(result).not.toHaveProperty('geneId');
          expect(result).not.toHaveProperty('deletedAt');
        }
      });

      test('a single expression variant by ident', async () => {
        const {body: result} = await request
          .get(`/api/reports/${report.ident}/expression-variants/${variant.ident}`)
          .auth(username, password)
          .type('json')
          .expect(HTTP_STATUS.OK);
        expect(result).toHaveProperty('ident', variant.ident);
        expect(result).toHaveProperty('gene', variant.gene.dataValues);
        expect(typeof result.gene).toBe('object');

        expect(result).not.toHaveProperty('kbMatches');
        expect(result.gene).not.toHaveProperty('copyVariants');
        expect(result.gene).not.toHaveProperty('expressionVariants');

        expect(result).not.toHaveProperty('id');
        expect(result).not.toHaveProperty('reportId');
        expect(result).not.toHaveProperty('geneId');
        expect(result).not.toHaveProperty('deletedAt');
      });
    });
  });
});

afterAll(async () => {
  await server.close();
});
