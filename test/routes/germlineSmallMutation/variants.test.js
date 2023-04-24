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
  patientHistory: 'default patient',
  familyHistory: 'default family',
  hidden: false,
};
const UPDATE_DATA = {
  patientHistory: 'Updated patient history',
  familyHistory: 'updated family history',
  cglReviewResult: 'pathogenic',
  returnedToClinician: 'yes',
  referralHcp: 'yes',
  knownToHcp: 'yes',
  reasonNoHcpReferral: 'reason for hcp referral',
  hgvsCdna: 'new hgvsCdna',
  previouslyReported: 'yes',
};

const germlineVariantProperties = [
  'ident', 'createdAt', 'updatedAt', 'hidden', 'flagged', 'clinvar', 'cglCategory', 'gmaf',
  'transcript', 'gene', 'variant', 'impact', 'chromosome', 'position', 'dbSnpIds', 'clinvarIds',
  'cosmicIds', 'reference', 'alteration', 'score', 'zygosityGermline', 'preferredTranscript',
  'hgvsCdna', 'hgvsProtein', 'zygosityTumour', 'genomicVariantReads', 'rnaVariantReads',
  'geneSomaticAbberation', 'notes', 'type', 'patientHistory', 'familyHistory',
  'tcgaCompNormPercentile', 'tcgaCompPercentile', 'gtexCompPercentile', 'fcBodymap',
  'geneExpressionRpkm', 'additionalInfo', 'hidden', 'patientHistory', 'familyHistory',
  'cglReviewResult', 'returnedToClinician', 'referralHcp', 'knownToHcp', 'reasonNoHcpReferral',
];

const checkGermlineVariant = (variantObject) => {
  germlineVariantProperties.forEach((element) => {
    expect(variantObject).toHaveProperty(element);
  });
  expect(variantObject).toEqual(expect.not.objectContaining({
    id: expect.any(Number),
    germlineReportId: expect.any(Number),
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
    report = await db.models.germlineSmallMutation.create({
      sourceVersion: 'v1.0.0',
      sourcePath: '/some/random/source/path',
      biofxAssignedId: testUser.id,
      exported: false,
      patientId: 'TESTPAT01',
      biopsyName: 'TEST123',
    });

    // Create a initial variant data
    variant = await db.models.germlineSmallMutationVariant.create({
      ...CREATE_DATA,
      germlineReportId: report.id,
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
      const result = await db.models.germlineSmallMutationVariant.findOne({where: {ident: res.body.ident}});
      expect(result).not.toBeNull();
    });
  });

  describe('PUT', () => {
    let germlineVariantUpdate;

    beforeEach(async () => {
      germlineVariantUpdate = await db.models.germlineSmallMutationVariant.create({
        ...CREATE_DATA, germlineReportId: report.id,
      });
    });

    afterEach(async () => {
      await db.models.germlineSmallMutationVariant.destroy({where: {ident: germlineVariantUpdate.ident}, force: true});
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
      await db.models.germlineSmallMutationVariant.destroy({where: {ident: germlineVariantUpdate.ident}});

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
      germlineVariantDelete = await db.models.germlineSmallMutationVariant.create({
        ...CREATE_DATA, germlineReportId: report.id,
      });
    });

    afterEach(async () => {
      await db.models.germlineSmallMutationVariant.destroy({
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
      const result = await db.models.germlineSmallMutationVariant.findOne({where: {id: germlineVariantDelete.id}});

      expect(result).toBeNull();
    });

    test('/{variant} - 404 Not Found no variant data to delete', async () => {
      // First soft-delete record
      await db.models.germlineSmallMutationVariant.destroy({where: {ident: germlineVariantDelete.ident}});

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
    await db.models.germlineSmallMutation.destroy({where: {ident: report.ident}, force: true});

    // verify report is deleted
    const result = await db.models.germlineSmallMutation.findOne({where: {ident: report.ident}, paranoid: false});
    expect(result).toBeNull();
  });
});

afterAll(async () => {
  await server.close();
});
