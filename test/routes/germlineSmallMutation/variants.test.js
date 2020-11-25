const HTTP_STATUS = require('http-status-codes');
const supertest = require('supertest');
const getPort = require('get-port');
const db = require('../../../app/models');

const CONFIG = require('../../../app/config');
const {listen} = require('../../../app');

CONFIG.set('env', 'test');
const {username, password} = CONFIG.get('testing');

let server;
let request;
let testUser;

const CREATE_DATA = {
  gene: 'ARTBAN',
  patient_history: 'default_patient',
  family_history: 'default_family',
  hidden: false,
};
const UPDATE_DATA = {
  patient_history: 'Updated patient history',
  family_history: 'updated family history',
};

const germlineVariantProperties = [
  'ident', 'createdAt', 'updatedAt', 'hidden', 'flagged', 'clinvar', 'cgl_category', 'gmaf', 'transcript',
  'gene', 'variant', 'impact', 'chromosome', 'position', 'dbSNP', 'reference', 'alteration', 'score',
  'zygosity_germline', 'preferred_transcript', 'hgvs_cdna', 'hgvs_protein', 'zygosity_tumour',
  'genomic_variant_reads', 'rna_variant_reads', 'gene_somatic_abberation', 'notes', 'type',
  'patient_history', 'family_history', 'tcga_comp_norm_percentile', 'tcga_comp_percentile',
  'gtex_comp_percentile', 'fc_bodymap', 'gene_expression_rpkm', 'additional_info',
];

const checkGermlineVariant = (variantObject) => {
  germlineVariantProperties.forEach((element) => {
    expect(variantObject).toHaveProperty(element);
  });
  expect(variantObject).toEqual(expect.not.objectContaining({
    id: expect.any(Number),
    germline_report_id: expect.any(Number),
    deletedAt: expect.any(String),
  }));
};

// Start API
beforeAll(async () => {
  const port = await getPort({port: CONFIG.get('web:port')});
  server = await listen(port);
  request = supertest(server);

  // get test user
  testUser = await db.models.user.findOne({
    where: {username},
  });
});

describe('/germline-small-mutation-reports/:gsm_report/variants', () => {
  let report;
  let variant;
  let BASE_URI;

  beforeAll(async () => {
    // create a report to be used in tests
    report = await db.models.germline_small_mutation.create({
      source_version: 'v1.0.0',
      source_path: '/some/random/source/path',
      biofx_assigned_id: testUser.id,
      exported: false,
      patientId: 'TESTPAT01',
      biopsyName: 'TEST123',
    });

    // Create a initial variant data
    variant = await db.models.germline_small_mutation_variant.create({
      ...CREATE_DATA,
      germline_report_id: report.id,
    });

    BASE_URI = `/api/germline-small-mutation-reports/${report.ident}/variants`;
  });

  describe('GET', () => {
    test('/ - 200 Success', async () => {
      const res = await request
        .get(BASE_URI)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);

      const [entry] = res.body;

      checkGermlineVariant(entry);
      expect(entry).toEqual(expect.objectContaining(CREATE_DATA));
    });

    test('/{variant} - 200 Success', async () => {
      const res = await request
        .get(`${BASE_URI}/${variant.ident}`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      checkGermlineVariant(res.body);
      expect(res.body).toEqual(expect.objectContaining(CREATE_DATA));
    });
  });

  describe('POST', () => {
    test('/ - 201 Created', async () => {
      const res = await request
        .post(BASE_URI)
        .send(CREATE_DATA)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.CREATED);

      checkGermlineVariant(res.body);
      expect(res.body).toEqual(expect.objectContaining(CREATE_DATA));

      // Check that record was created in the db
      const result = await db.models.germline_small_mutation_variant.findOne({where: {ident: res.body.ident}});
      expect(result).not.toBeNull();
    });
  });

  describe('PUT', () => {
    let germlineVariantUpdate;

    beforeEach(async () => {
      germlineVariantUpdate = await db.models.germline_small_mutation_variant.create({
        ...CREATE_DATA, germline_report_id: report.id,
      });
    });

    afterEach(async () => {
      await db.models.germline_small_mutation_variant.destroy({where: {ident: germlineVariantUpdate.ident}, force: true});
    });

    test('/{variant} - 200 Success', async () => {
      const res = await request
        .put(`${BASE_URI}/${germlineVariantUpdate.ident}`)
        .send(UPDATE_DATA)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      checkGermlineVariant(res.body);
      expect(res.body).toEqual(expect.objectContaining(UPDATE_DATA));
    });

    test('/{variant} - 400 Bad Request Failed Validation', async () => {
      await request
        .put(`${BASE_URI}/${germlineVariantUpdate.ident}`)
        .send({...UPDATE_DATA, id: 6})
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.BAD_REQUEST);
    });

    test('/{variant} - 404 Not Found no variant data to update', async () => {
      // First soft-delete record
      await db.models.germline_small_mutation_variant.destroy({where: {ident: germlineVariantUpdate.ident}});

      await request
        .put(`${BASE_URI}/${germlineVariantUpdate.ident}`)
        .send(UPDATE_DATA)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.NOT_FOUND);
    });
  });

  describe('DELETE', () => {
    let germlineVariantDelete;

    beforeEach(async () => {
      germlineVariantDelete = await db.models.germline_small_mutation_variant.create({
        ...CREATE_DATA, germline_report_id: report.id,
      });
    });

    afterEach(async () => {
      await db.models.germline_small_mutation_variant.destroy({
        where: {ident: germlineVariantDelete.ident}, force: true,
      });
    });

    test('/{variant} - 204 No content', async () => {
      await request
        .delete(`${BASE_URI}/${germlineVariantDelete.ident}`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.NO_CONTENT);

      // Verify that the record was deleted
      const result = await db.models.germline_small_mutation_variant.findOne({where: {id: germlineVariantDelete.id}});

      expect(result).toBeNull();
    });

    test('/{variant} - 404 Not Found no variant data to delete', async () => {
      // First soft-delete record
      await db.models.germline_small_mutation_variant.destroy({where: {ident: germlineVariantDelete.ident}});

      await request
        .delete(`${BASE_URI}/${germlineVariantDelete.ident}`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.NOT_FOUND);
    });
  });

  // delete report
  afterAll(async () => {
    // delete newly created report and all of it's components
    // indirectly by hard deleting newly created patient
    await db.models.germline_small_mutation.destroy({where: {ident: report.ident}, force: true});

    // verify report is deleted
    const result = await db.models.germline_small_mutation.findOne({where: {ident: report.ident}, paranoid: false});
    expect(result).toBeNull();
  });
});

afterAll(async () => {
  await server.close();
});
