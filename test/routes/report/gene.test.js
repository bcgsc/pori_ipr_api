const getPort = require('get-port');
const supertest = require('supertest');
const HTTP_STATUS = require('http-status-codes');

const db = require('../../../app/models');
// get test user info
const CONFIG = require('../../../app/config');
const {listen} = require('../../../app');

CONFIG.set('env', 'test');
const {username, password} = CONFIG.get('testing');

const GENE_DATA = {
  name: 'TEST NAME',
  tumourSuppressor: true,
  oncogene: true,
  kbStatementRelated: true,
  drugTargetable: true,
  knownFusionPartner: true,
  therapeuticAssociated: true,
  knownSmallMutation: true,
  cancerGeneListMatch: true,
};

const GENE_UPDATE_DATA = {
  name: 'UPDATED NAME',
  tumourSuppressor: false,
  oncogene: false,
  kbStatementRelated: false,
  drugTargetable: false,
  knownFusionPartner: false,
  therapeuticAssociated: false,
  knownSmallMutation: false,
  cancerGeneListMatch: false,
};

const geneProperties = [
  'ident', 'createdAt', 'name', 'tumourSuppressor', 'oncogene',
  'kbStatementRelated', 'drugTargetable', 'knownFusionPartner',
  'therapeuticAssociated', 'knownSmallMutation', 'cancerGeneListMatch',
];

const checkGene = (geneObject) => {
  geneProperties.forEach((element) => {
    expect(geneObject).toHaveProperty(element);
  });
  expect(geneObject).toEqual(expect.not.objectContaining({
    id: expect.any(Number),
    reportId: expect.any(Number),
    updatedBy: expect.any(Number),
    deletedAt: expect.any(String),
  }));
};

const checkGenes = (genes) => {
  genes.forEach((gene) => {
    checkGene(gene);
  });
};

let server;
let request;

// Start API
beforeAll(async () => {
  const port = await getPort({port: CONFIG.get('web:port')});
  server = await listen(port);
  request = supertest(server);
});

describe('/reports/{report}/genes', () => {
  let report;

  beforeAll(async () => {
    // Get genomic template
    const template = await db.models.template.findOne({where: {name: 'genomic'}});
    // Create report
    report = await db.models.report.create({
      templateId: template.id,
      patientId: 'PROBE_TEST_PATIENT',
    });
  });

  afterAll(async () => {
    return report.destroy({force: true});
  });

  describe('GET', () => {
    let getGene;

    beforeEach(async () => {
      getGene = await db.models.genes.create({
        ...GENE_DATA, reportId: report.id,
      });
    });

    afterEach(async () => {
      return db.models.genes.destroy({
        where: {ident: getGene.ident},
        force: true,
      });
    });

    test('/ - 200 Success', async () => {
      const res = await request
        .get(`/api/reports/${report.ident}/genes`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      checkGenes(res.body);
    });

    test('/ - 200 Success - Search Text With Results', async () => {
      const res = await request
        .get(`/api/reports/${report.ident}/genes?search=test`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      checkGenes(res.body);
      expect(res.body).toEqual(expect.arrayContaining([
        expect.objectContaining({name: expect.stringContaining('TEST')}),
      ]));
    });

    test('/ - 200 Success - Search Text With No Results', async () => {
      const res = await request
        .get(`/api/reports/${report.ident}/genes?search=not_gene`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(0);
    });

    test('/{geneName} - 200 Success', async () => {
      const res = await request
        .get(`/api/reports/${report.ident}/genes/${getGene.name}`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      expect(res.body).not.toBeNull();
      checkGene(res.body);
    });

    test('/{geneName} - 404 Not Found', async () => {
      // Remove gene
      await getGene.destroy();

      await request
        .get(`/api/reports/${report.ident}/genes/${getGene.name}`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.NOT_FOUND);
    });
  });

  describe('PUT', () => {
    let putGene;

    beforeEach(async () => {
      putGene = await db.models.genes.create({
        ...GENE_DATA, reportId: report.id,
      });
    });

    afterEach(async () => {
      return putGene.destroy({force: true});
    });

    test('/{geneName} - 200 Success', async () => {
      const res = await request
        .put(`/api/reports/${report.ident}/genes/${putGene.name}`)
        .send(GENE_UPDATE_DATA)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      expect(res.body).not.toBeNull();
      checkGene(res.body);
      expect(res.body).toEqual(expect.objectContaining(GENE_UPDATE_DATA));
    });

    test('/{geneName} - 400 Bad Request - Additional Property', async () => {
      await request
        .put(`/api/reports/${report.ident}/genes/${putGene.name}`)
        .send({
          ...GENE_UPDATE_DATA,
          additionalProperty: 'ADDITIONAL_PROPERTY',
        })
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.BAD_REQUEST);
    });

    test('/{geneName} - 400 Bad Request - Incorrect field type', async () => {
      await request
        .put(`/api/reports/${report.ident}/genes/${putGene.name}`)
        .send({
          ...GENE_UPDATE_DATA,
          kbStatementRelated: 'NOT_A_BOOLEAN',
        })
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.BAD_REQUEST);
    });

    test('/{geneName} - 400 Bad Request - Name too short', async () => {
      await request
        .put(`/api/reports/${report.ident}/genes/${putGene.name}`)
        .send({
          name: '',
        })
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.BAD_REQUEST);
    });

    test('/{geneName} - 409 Conflict - Gene name is already taken', async () => {
      const dupGene = await db.models.genes.create({...GENE_UPDATE_DATA, reportId: report.id});

      await request
        .put(`/api/reports/${report.ident}/genes/${putGene.name}`)
        .send(GENE_UPDATE_DATA)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.CONFLICT);

      await dupGene.destroy({force: true});
    });
  });
});

afterAll(async () => {
  global.gc && global.gc();
  await server.close();
});
