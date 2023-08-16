const getPort = require('get-port');
const supertest = require('supertest');
const HTTP_STATUS = require('http-status-codes');

const db = require('../../../app/models');
// get test user info
const CONFIG = require('../../../app/config');
const {listen} = require('../../../app');

CONFIG.set('env', 'test');
const {username, password} = CONFIG.get('testing');

const PROBE_TEST_DATA = {
  kbVersion: 'TEST KB VERSION',
  snpProbe: 'TEST SNP PROBE',
  snpGenes: 'TEST SNP GENES',
  snpVars: 'TEST SNP VARS',
  fusionProbe: 'TEST FUSION PROBE',
  fusionGenes: 'TEST GENES',
  fusionVars: 'TEST FUSION VARS',
  cancerGenes: 1234,
  cancerVars: 1234,
};

const PROBE_TEST_UPDATE_DATA = {
  kbVersion: 'UPDATED KB VERSION',
  snpProbe: 'UPDATED SNP PROBE',
  snpGenes: 'UPDATED SNP GENES',
  snpVars: 'UPDATED SNP VARS',
  fusionProbe: 'UPDATED FUSION PROBE',
  fusionGenes: 'UPDATED GENES',
  fusionVars: 'UPDATED FUSION VARS',
  cancerGenes: 5678,
  cancerVars: 5678,
};

const probeTestProperties = [
  'ident', 'createdAt', 'kbVersion', 'snpProbe', 'snpGenes', 'snpVars',
  'fusionProbe', 'fusionGenes', 'fusionVars', 'germlineGenes', 'germlineVars',
  'pharmacogenomicGenes', 'pharmacogenomicVars', 'cancerGenes', 'cancerVars',
];

const checkProbeTest = (probeTestObject) => {
  probeTestProperties.forEach((element) => {
    expect(probeTestObject).toHaveProperty(element);
  });
  expect(probeTestObject).toEqual(expect.not.objectContaining({
    id: expect.any(Number),
    reportId: expect.any(Number),
    updatedBy: expect.any(Number),
    deletedAt: expect.any(String),
  }));
};

let server;
let request;

// Start API
beforeAll(async () => {
  const port = await getPort({port: CONFIG.get('web:port')});
  server = await listen(port);
  request = supertest(server);
});

describe('/reports/{report}/probe-test-information', () => {
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
    let getProbeTest;

    beforeEach(async () => {
      getProbeTest = await db.models.probeTestInformation.create({
        ...PROBE_TEST_DATA, reportId: report.id,
      });
    });

    afterEach(async () => {
      return db.models.probeTestInformation.destroy({
        where: {ident: getProbeTest.ident},
        force: true,
      });
    });

    test('/ - 200 Success', async () => {
      const res = await request
        .get(`/api/reports/${report.ident}/probe-test-information`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      expect(res.body).not.toBeNull();
      checkProbeTest(res.body);
    });

    test('/ - 404 Not Found', async () => {
      // Remove probe test
      await getProbeTest.destroy();

      await request
        .get(`/api/reports/${report.ident}/probe-test-information`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.NOT_FOUND);
    });
  });

  describe('PUT', () => {
    let putProbeTest;

    beforeEach(async () => {
      putProbeTest = await db.models.probeTestInformation.create({
        ...PROBE_TEST_DATA, reportId: report.id,
      });
    });

    afterEach(async () => {
      return putProbeTest.destroy({force: true});
    });

    test('/ - 200 Success', async () => {
      const res = await request
        .put(`/api/reports/${report.ident}/probe-test-information`)
        .send(PROBE_TEST_UPDATE_DATA)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      expect(res.body).not.toBeNull();
      checkProbeTest(res.body);
      expect(res.body).toEqual(expect.objectContaining(PROBE_TEST_UPDATE_DATA));
    });

    test('/ - 400 Bad Request - Additional Property', async () => {
      await request
        .put(`/api/reports/${report.ident}/probe-test-information`)
        .send({
          ...PROBE_TEST_UPDATE_DATA,
          additionalProperty: 'ADDITIONAL_PROPERTY',
        })
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.BAD_REQUEST);
    });

    test('/ - 400 Bad Request - Incorrect field type', async () => {
      await request
        .put(`/api/reports/${report.ident}/probe-test-information`)
        .send({
          ...PROBE_TEST_UPDATE_DATA,
          kbVersion: {
            key: 'VALUE',
          },
        })
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.BAD_REQUEST);
    });
  });
});

afterAll(async () => {
  global.gc && global.gc();
  await server.close();
});
