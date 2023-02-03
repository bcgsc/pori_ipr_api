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

const proteinVariantProperties = [
  'percentile',
  'kiqr',
  'qc',
  'comparator',
  'totalSampleObserved',
  'secondaryPercentile',
  'secondaryComparator',
  'kbCategory',
  'germline',
  'library',
  'comments',
  'gene',
];

const checkProteinVariant = (variantObject) => {
  proteinVariantProperties.forEach((element) => {
    expect(variantObject).toHaveProperty(element);
  });
  expect(variantObject).toEqual(expect.not.objectContaining({
    id: expect.any(Number),
    reportId: expect.any(Number),
    deletedAt: expect.any(String),
    geneId: expect.any(Number),
  }));
};

const checkProteinVariants = (variants) => {
  variants.forEach((variant) => {
    checkProteinVariant(variant);
  });
};

beforeAll(async () => {
  const port = await getPort({port: CONFIG.get('web:port')});
  server = await listen(port);
  request = supertest(server);
});

describe('/reports/{report}/protein-variants', () => {
  let report;
  let variant;

  beforeAll(async () => {
    // Create report, gene and protein variant
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

    variant = await db.models.proteinVariants.create({
      reportId: report.id,
      geneId: gene.id,
    });

    await db.models.kbMatches.create({
      reportId: report.id,
      category: 'therapeutic',
      variantType: 'protein',
      variantId: variant.id,
    });
  });

  describe('GET', () => {
    test('/ - 200 Success', async () => {
      const res = await request
        .get(`/api/reports/${report.ident}/protein-variants`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      expect(Array.isArray(res.body)).toBe(true);

      checkProteinVariants(res.body);
      expect(res.body.length).toBeGreaterThan(0);

      const [record] = res.body;

      expect(record).toHaveProperty('kbMatches');
      expect(Array.isArray(record.kbMatches)).toBe(true);
    }, LONGER_TIMEOUT);

    test('/{proteinVariant} - 200 Success', async () => {
      const res = await request
        .get(`/api/reports/${report.ident}/protein-variants/${variant.ident}`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      checkProteinVariant(res.body);
    });
  });

  describe('PUT', () => {
    let proteinVariantUpdate;

    beforeEach(async () => {
      const gene = await db.models.genes.create({
        reportId: report.id,
        name: 'Fake Update Gene',
      });

      proteinVariantUpdate = await db.models.proteinVariants.create({
        reportId: report.id,
        geneId: gene.id,
      });
    });

    afterEach(async () => {
      await db.models.proteinVariants.destroy({
        where: {ident: proteinVariantUpdate.ident}, force: true,
      });
    });

    test('/{proteinVariant} - 200 Success', async () => {
      const res = await request
        .put(`/api/reports/${report.ident}/protein-variants/${proteinVariantUpdate.ident}`)
        .send(UPDATE_DATA)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      checkProteinVariant(res.body);
      expect(res.body).toEqual(expect.objectContaining(UPDATE_DATA));
    });
  });

  describe('DELETE', () => {
    let proteinVariantDelete;

    beforeEach(async () => {
      const gene = await db.models.genes.create({
        reportId: report.id,
        name: 'Fake Delete Gene',
      });

      proteinVariantDelete = await db.models.proteinVariants.create({
        reportId: report.id,
        geneId: gene.id,
      });
    });

    afterEach(async () => {
      await db.models.proteinVariants.destroy({
        where: {ident: proteinVariantDelete.ident}, force: true,
      });
    });

    test('/{proteinVariant} - 204 No content', async () => {
      await request
        .delete(`/api/reports/${report.ident}/protein-variants/${proteinVariantDelete.ident}`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.NO_CONTENT);

      // Check that entry was soft deleted
      const result = db.models.proteinVariants.findOne({where: {ident: proteinVariantDelete.ident}, paranoid: false});
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
