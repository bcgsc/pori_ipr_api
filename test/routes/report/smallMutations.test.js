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
  displayName: 'New display name',
};

const smallMutationProperties = ['transcript', 'proteinChange', 'chromosome', 'startPosition',
  'endPosition', 'refSeq', 'altSeq', 'zygosity', 'tumourAltCount', 'tumourRefCount', 'tumourDepth',
  'rnaAltCount', 'rnaRefCount', 'rnaDepth', 'normalAltCount', 'normalRefCount', 'normalDepth',
  'hgvsProtein', 'hgvsCds', 'hgvsGenomic', 'ncbiBuild', 'germline',
  'tumourAltCopies', 'tumourRefCopies', 'library', 'comments', 'displayName', 'gene'];

const checkSmallMutation = (variantObject) => {
  smallMutationProperties.forEach((element) => {
    expect(variantObject).toHaveProperty(element);
  });
  expect(variantObject).toEqual(expect.not.objectContaining({
    id: expect.any(Number),
    reportId: expect.any(Number),
    deletedAt: expect.any(String),
    geneId: expect.any(Number),
  }));
};

const checkSmallMutations = (variants) => {
  variants.forEach((variant) => {
    checkSmallMutation(variant);
  });
};

beforeAll(async () => {
  const port = await getPort({port: CONFIG.get('web:port')});
  server = await listen(port);
  request = supertest(server);
});

describe('/reports/{report}/small-mutations', () => {
  let report;
  let variant;

  beforeAll(async () => {
    // Create report, gene and small mutation
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

    variant = await db.models.smallMutations.create({
      reportId: report.id,
      geneId: gene.id,
    });

    await db.models.kbMatches.create({
      reportId: report.id,
      category: 'therapeutic',
      variantType: 'mut',
      variantId: variant.id,
    });
  });

  describe('GET', () => {
    test('/ - 200 Success', async () => {
      const res = await request
        .get(`/api/reports/${report.ident}/small-mutations`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      expect(Array.isArray(res.body)).toBe(true);

      checkSmallMutations(res.body);
      expect(res.body.length).toBeGreaterThan(0);

      const [record] = res.body;

      expect(record).toHaveProperty('kbMatches');
      expect(Array.isArray(record.kbMatches)).toBe(true);
    }, LONGER_TIMEOUT);

    test('/{smallMutation} - 200 Success', async () => {
      const res = await request
        .get(`/api/reports/${report.ident}/small-mutations/${variant.ident}`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      checkSmallMutation(res.body);
    });
  });

  describe('PUT', () => {
    let smallMutationUpdate;

    beforeEach(async () => {
      const gene = await db.models.genes.create({
        reportId: report.id,
        name: 'Fake Update Gene',
      });

      smallMutationUpdate = await db.models.smallMutations.create({
        reportId: report.id,
        geneId: gene.id,
      });
    });

    afterEach(async () => {
      await db.models.smallMutations.destroy({
        where: {ident: smallMutationUpdate.ident}, force: true,
      });
    });

    test('/{smallMutation} - 200 Success', async () => {
      const res = await request
        .put(`/api/reports/${report.ident}/small-mutations/${smallMutationUpdate.ident}`)
        .send(UPDATE_DATA)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      checkSmallMutation(res.body);
      expect(res.body).toEqual(expect.objectContaining(UPDATE_DATA));
    });
  });

  describe('DELETE', () => {
    let smallMutationDelete;

    beforeEach(async () => {
      const gene = await db.models.genes.create({
        reportId: report.id,
        name: 'Fake Delete Gene',
      });

      smallMutationDelete = await db.models.smallMutations.create({
        reportId: report.id,
        geneId: gene.id,
      });
    });

    afterEach(async () => {
      await db.models.smallMutations.destroy({
        where: {ident: smallMutationDelete.ident}, force: true,
      });
    });

    test('/{smallMutation} - 204 No content', async () => {
      await request
        .delete(`/api/reports/${report.ident}/small-mutations/${smallMutationDelete.ident}`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.NO_CONTENT);

      // Check that entry was soft deleted
      const result = db.models.smallMutations.findOne({where: {ident: smallMutationDelete.ident}, paranoid: false});
      expect(result.deletedAt).not.toBeNull();
    });
  });

  afterAll(async () => {
    // Destroy report and all it's components
    await db.models.report.destroy({where: {ident: report.ident}, force: true});
  });
});

afterAll(async () => {
  global.gc && global.gc();
  await server.close();
});
