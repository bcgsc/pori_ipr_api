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
  copyChange: 23,
  lohState: 'Updated loh state',
  cnvState: 'Updated cnv state',
  chromosomeBand: 'Update chrom band',
  start: 1,
  end: 6,
  size: 2.4,
  kbCategory: 'Updated category',
  log2Cna: '12',
  cna: '10',
  germline: true,
  library: 'Updated library',
  comments: 'New comments',
  displayName: 'New display name',
};

const copyVariantProperties = [
  'ident', 'createdAt', 'updatedAt', 'copyChange',
  'lohState', 'cnvState', 'chromosomeBand', 'start',
  'end', 'size', 'kbCategory', 'log2Cna', 'cna', 'gene',
  'germline', 'library', 'comments', 'displayName', 'selected',
];

const checkCopyVariant = (variantObject) => {
  copyVariantProperties.forEach((element) => {
    expect(variantObject).toHaveProperty(element);
  });
  expect(variantObject).toEqual(expect.not.objectContaining({
    id: expect.any(Number),
    reportId: expect.any(Number),
    deletedAt: expect.any(String),
    geneId: expect.any(Number),
  }));
};

const checkCopyVariants = (variants) => {
  variants.forEach((variant) => {
    checkCopyVariant(variant);
  });
};

beforeAll(async () => {
  const port = await getPort({port: CONFIG.get('web:port')});
  server = await listen(port);
  request = supertest(server);
});

describe('/reports/{report}/copy-variants', () => {
  let report;
  let variant;

  beforeAll(async () => {
    // Create report, gene and copy variant
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

    variant = await db.models.copyVariants.create({
      reportId: report.id,
      geneId: gene.id,
      cnvState: 'Test cnv state',
    });

    await db.models.kbMatches.create({
      reportId: report.id,
      variantType: 'cnv',
      variantId: variant.id,
    });
  });

  describe('GET', () => {
    test('/ - 200 Success', async () => {
      const res = await request
        .get(`/api/reports/${report.ident}/copy-variants`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      expect(Array.isArray(res.body)).toBe(true);

      checkCopyVariants(res.body);
      expect(res.body.length).toBeGreaterThan(0);

      const [record] = res.body;

      expect(record).toHaveProperty('kbMatches');
      expect(Array.isArray(record.kbMatches)).toBe(true);
    }, LONGER_TIMEOUT);

    test('/{copyVariant} - 200 Success', async () => {
      const res = await request
        .get(`/api/reports/${report.ident}/copy-variants/${variant.ident}`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      checkCopyVariant(res.body);
    });
  });

  describe('PUT', () => {
    let copyVariantUpdate;

    beforeEach(async () => {
      const gene = await db.models.genes.create({
        reportId: report.id,
        name: 'Fake Update Gene',
      });

      copyVariantUpdate = await db.models.copyVariants.create({
        reportId: report.id,
        geneId: gene.id,
      });
    });

    afterEach(async () => {
      await db.models.copyVariants.destroy({
        where: {ident: copyVariantUpdate.ident}, force: true,
      });
    });

    test('/{copyVariant} - 200 Success', async () => {
      const res = await request
        .put(`/api/reports/${report.ident}/copy-variants/${copyVariantUpdate.ident}`)
        .send(UPDATE_DATA)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      checkCopyVariant(res.body);
      expect(res.body).toEqual(expect.objectContaining(UPDATE_DATA));
    });
  });

  describe('DELETE', () => {
    let copyVariantDelete;

    beforeEach(async () => {
      const gene = await db.models.genes.create({
        reportId: report.id,
        name: 'Fake Delete Gene',
      });

      copyVariantDelete = await db.models.copyVariants.create({
        reportId: report.id,
        geneId: gene.id,
      });
    });

    afterEach(async () => {
      await db.models.copyVariants.destroy({
        where: {ident: copyVariantDelete.ident}, force: true,
      });
    });

    test('/{copyVariant} - 204 No content', async () => {
      await request
        .delete(`/api/reports/${report.ident}/copy-variants/${copyVariantDelete.ident}`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.NO_CONTENT);

      // Check that entry was soft deleted
      const result = db.models.copyVariants.findOne({where: {ident: copyVariantDelete.ident}, paranoid: false});
      expect(result.deletedAt).not.toBeNull();
    });
  });

  afterAll(async () => {
    // Destroy report and all it's components
    await db.models.report.destroy({where: {ident: report.ident}});
  });
});

afterAll(async () => {
  global.gc && global.gc();
  await server.close();
});
