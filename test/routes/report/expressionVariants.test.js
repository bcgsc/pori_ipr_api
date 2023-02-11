const HTTP_STATUS = require('http-status-codes');
const supertest = require('supertest');
const getPort = require('get-port');

const db = require('../../../app/models');
// get test user info
const CONFIG = require('../../../app/config');
const {listen} = require('../../../app');

const LONGER_TIMEOUT = 50000;

// get credentials from the CONFIG
CONFIG.set('env', 'test');
const {username, password} = CONFIG.get('testing');

let server;
let request;

const UPDATE_DATA = {
  comments: 'New comments',
};

const expressionVariantProperties = ['ident', 'gene', 'location', 'rnaReads', 'rpkm', 'tpm',
  'expressionState', 'diseasePercentile', 'diseasekIQR',
  'diseaseQC', 'diseaseFoldChange', 'diseaseZScore', 'primarySitePercentile',
  'primarySitekIQR', 'primarySiteQC', 'primarySiteFoldChange', 'primarySiteZScore',
  'biopsySitePercentile', 'biopsySitekIQR',
  'biopsySiteQC', 'biopsySiteFoldChange', 'biopsySiteZScore',
  'internalPancancerPercentile', 'internalPancancerkIQR', 'internalPancancerQC',
  'internalPancancerFoldChange', 'internalPancancerZScore', 'kbCategory', 'germline',
  'library', 'comments', 'gene'];

const checkExpressionVariant = (variantObject) => {
  expressionVariantProperties.forEach((element) => {
    expect(variantObject).toHaveProperty(element);
  });
  expect(variantObject).toEqual(expect.not.objectContaining({
    id: expect.any(Number),
    reportId: expect.any(Number),
    deletedAt: expect.any(String),
    geneId: expect.any(Number),
  }));
};

const checkExpressionVariants = (variants) => {
  variants.forEach((variant) => {
    checkExpressionVariant(variant);
  });
};

beforeAll(async () => {
  const port = await getPort({port: CONFIG.get('web:port')});
  server = await listen(port);
  request = supertest(server);
});

describe('/reports/{report}/expression-variants', () => {
  let report;
  let variant;

  beforeAll(async () => {
    // Create report, gene and expression variant
    // Get genomic template
    const template = await db.models.template.findOne({where: {name: 'genomic'}});
    // Create Report
    report = await db.models.report.create({
      templateId: template.id,
      patientId: 'TESTPATIENT1234',
    });

    const gene = await db.models.genes.create({
      reportId: report.id,
      name: 'Fake Gene',
    });

    variant = await db.models.expressionVariants.create({
      reportId: report.id,
      geneId: gene.id,
      expressionState: 'State',
    });

    await db.models.kbMatches.create({
      reportId: report.id,
      category: 'therapeutic',
      variantType: 'exp',
      variantId: variant.id,
    });
  });

  describe('GET', () => {
    test('/ - 200 Success', async () => {
      const res = await request
        .get(`/api/reports/${report.ident}/expression-variants`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      expect(Array.isArray(res.body)).toBe(true);

      checkExpressionVariants(res.body);
      expect(res.body.length).toBeGreaterThan(0);

      const [record] = res.body;

      expect(record).toHaveProperty('kbMatches');
      expect(Array.isArray(record.kbMatches)).toBe(true);
    }, LONGER_TIMEOUT);

    test('/{expressionVariant} - 200 Success', async () => {
      const res = await request
        .get(`/api/reports/${report.ident}/expression-variants/${variant.ident}`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      checkExpressionVariant(res.body);
    });
  });

  describe('PUT', () => {
    let expressionVariantUpdate;

    beforeEach(async () => {
      const gene = await db.models.genes.create({
        reportId: report.id,
        name: 'Fake Update Gene',
      });

      expressionVariantUpdate = await db.models.expressionVariants.create({
        reportId: report.id,
        geneId: gene.id,
        expressionState: 'State',
      });
    });

    afterEach(async () => {
      await db.models.expressionVariants.destroy({
        where: {ident: expressionVariantUpdate.ident}, force: true,
      });
    });

    test('/{expressionVariant} - 200 Success', async () => {
      const res = await request
        .put(`/api/reports/${report.ident}/expression-variants/${expressionVariantUpdate.ident}`)
        .send(UPDATE_DATA)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      checkExpressionVariant(res.body);
      expect(res.body).toEqual(expect.objectContaining(UPDATE_DATA));
    });
  });

  describe('DELETE', () => {
    let expressionVariantDelete;

    beforeEach(async () => {
      const gene = await db.models.genes.create({
        reportId: report.id,
        name: 'Fake Delete Gene',
      });

      expressionVariantDelete = await db.models.expressionVariants.create({
        reportId: report.id,
        geneId: gene.id,
      });
    });

    afterEach(async () => {
      await db.models.expressionVariants.destroy({
        where: {ident: expressionVariantDelete.ident}, force: true,
      });
    });

    test('/{expressionVariant} - 204 No content', async () => {
      await request
        .delete(`/api/reports/${report.ident}/expression-variants/${expressionVariantDelete.ident}`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.NO_CONTENT);

      // Check that entry was soft deleted
      const result = db.models.expressionVariants.findOne({where: {ident: expressionVariantDelete.ident}, paranoid: false});
      expect(result.deletedAt).not.toBeNull();
    });
  });

  afterAll(async () => {
    // Destroy report and all it's components
    await db.models.report.destroy({where: {ident: report.ident}, force: true});
  });
});

afterAll(async () => {
  await server.close();
});
