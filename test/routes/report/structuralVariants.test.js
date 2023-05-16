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

const structuralVariantProperties = ['exon1', 'exon2', 'breakpoint', 'eventType', 'detectedIn',
  'conventionalName', 'svg', 'svgTitle', 'name', 'frame', 'ctermGene',
  'ntermGene', 'ctermTranscript', 'ntermTranscript', 'omicSupport',
  'highQuality', 'germline', 'library', 'tumourAltCount',
  'tumourDepth', 'rnaAltCount', 'rnaDepth', 'comments', 'gene1', 'gene2'];

const checkStructuralVariant = (variantObject) => {
  structuralVariantProperties.forEach((element) => {
    expect(variantObject).toHaveProperty(element);
  });
  expect(variantObject).toEqual(expect.not.objectContaining({
    id: expect.any(Number),
    reportId: expect.any(Number),
    deletedAt: expect.any(String),
    gene1Id: expect.any(Number),
    gene2Id: expect.any(Number),
  }));
};

const checkStructuralVariants = (variants) => {
  variants.forEach((variant) => {
    checkStructuralVariant(variant);
  });
};

beforeAll(async () => {
  const port = await getPort({port: CONFIG.get('web:port')});
  server = await listen(port);
  request = supertest(server);
});

describe('/reports/{report}/structural-variants', () => {
  let report;
  let variant;

  beforeAll(async () => {
    // Create report, genes and protein variants
    // Get genomic template
    const template = await db.models.template.findOne({where: {name: 'genomic'}});
    // Create Report
    report = await db.models.report.create({
      templateId: template.id,
      patientId: 'TESTPATIENT1234',
    });

    const gene1 = await db.models.genes.create({
      reportId: report.id,
      name: 'Fake Gene 1',
    });
    const gene2 = await db.models.genes.create({
      reportId: report.id,
      name: 'Fake Gene 2',
    });

    variant = await db.models.structuralVariants.create({
      reportId: report.id,
      gene1Id: gene1.id,
      gene2Id: gene2.id,
    });

    await db.models.kbMatches.create({
      reportId: report.id,
      category: 'therapeutic',
      variantType: 'sv',
      variantId: variant.id,
    });
  });

  describe('GET', () => {
    test('/ - 200 Success', async () => {
      const res = await request
        .get(`/api/reports/${report.ident}/structural-variants`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      expect(Array.isArray(res.body)).toBe(true);

      checkStructuralVariants(res.body);
      expect(res.body.length).toBeGreaterThan(0);

      const [record] = res.body;

      expect(record).toHaveProperty('kbMatches');
      expect(Array.isArray(record.kbMatches)).toBe(true);
    }, LONGER_TIMEOUT);

    test('/{structuralVariant} - 200 Success', async () => {
      const res = await request
        .get(`/api/reports/${report.ident}/structural-variants/${variant.ident}`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      checkStructuralVariant(res.body);
    });
  });

  describe('PUT', () => {
    let structuralVariantUpdate;

    beforeEach(async () => {
      const gene1 = await db.models.genes.create({
        reportId: report.id,
        name: 'Fake Gene 3',
      });
      const gene2 = await db.models.genes.create({
        reportId: report.id,
        name: 'Fake Gene 4',
      });

      structuralVariantUpdate = await db.models.structuralVariants.create({
        reportId: report.id,
        gene1Id: gene1.id,
        gene2Id: gene2.id,
      });
    });

    afterEach(async () => {
      await db.models.structuralVariants.destroy({
        where: {ident: structuralVariantUpdate.ident}, force: true,
      });
    });

    test('/{structuralVariant} - 200 Success', async () => {
      const res = await request
        .put(`/api/reports/${report.ident}/structural-variants/${structuralVariantUpdate.ident}`)
        .send(UPDATE_DATA)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      checkStructuralVariant(res.body);
      expect(res.body).toEqual(expect.objectContaining(UPDATE_DATA));
    });
  });

  describe('DELETE', () => {
    let structuralVariantDelete;

    beforeEach(async () => {
      const gene = await db.models.genes.create({
        reportId: report.id,
        name: 'Fake Delete Gene',
      });

      structuralVariantDelete = await db.models.structuralVariants.create({
        reportId: report.id,
        geneId: gene.id,
      });
    });

    afterEach(async () => {
      await db.models.structuralVariants.destroy({
        where: {ident: structuralVariantDelete.ident}, force: true,
      });
    });

    test('/{structuralVariant} - 204 No content', async () => {
      await request
        .delete(`/api/reports/${report.ident}/structural-variants/${structuralVariantDelete.ident}`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.NO_CONTENT);

      // Check that entry was soft deleted
      const result = db.models.structuralVariants.findOne({where: {ident: structuralVariantDelete.ident}, paranoid: false});
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
