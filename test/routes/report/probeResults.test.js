const getPort = require('get-port');
const supertest = require('supertest');
const HTTP_STATUS = require('http-status-codes');
const {v4: uuidv4} = require('uuid');

const db = require('../../../app/models');
// get test user info
const CONFIG = require('../../../app/config');
const {listen} = require('../../../app');

CONFIG.set('env', 'test');
const {username, password} = CONFIG.get('testing');

const PROBE_RESULT_DATA = {
  variant: 'TEST VARIANT',
  sample: 'TEST SAMPLE',
  comments: 'TEST COMMENTS',
  displayName: 'TEST DISPLAY NAME',
};

const PROBE_RESULT_UPDATE_DATA = {
  variant: 'UPDATED VARIANT',
  sample: 'UPDATED SAMPLE',
  comments: 'UPDATED COMMENTS',
  displayName: 'NEW DISPLAY NAME',
};

const probeResultProperties = [
  'ident', 'createdAt', 'variant', 'sample', 'comments', 'gene', 'displayName',
];

const checkProbeResult = (probeResultObject) => {
  probeResultProperties.forEach((element) => {
    expect(probeResultObject).toHaveProperty(element);
  });
  expect(probeResultObject).toEqual(expect.not.objectContaining({
    id: expect.any(Number),
    reportId: expect.any(Number),
    geneId: expect.any(Number),
    updatedBy: expect.any(Number),
    deletedAt: expect.any(String),
    displayName: expect.any(String),
  }));
};

const checkProbeResults = (probeResults) => {
  probeResults.forEach((probeResult) => {
    checkProbeResult(probeResult);
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

describe('/reports/{report}/probe-results', () => {
  let report;
  let gene;

  beforeAll(async () => {
    // Get genomic template
    const template = await db.models.template.findOne({where: {name: 'genomic'}});
    // Create report
    report = await db.models.report.create({
      templateId: template.id,
      patientId: 'PROBE_TEST_PATIENT',
    });
    // Create gene
    gene = await db.models.genes.create({
      name: 'PROBE RESULTS TEST GENE',
      reportId: report.id,
    });
  });

  afterAll(async () => {
    return report.destroy({force: true});
  });

  describe('GET', () => {
    let getProbeResult;

    beforeEach(async () => {
      getProbeResult = await db.models.probeResults.create({
        ...PROBE_RESULT_DATA, reportId: report.id, geneId: gene.id,
      });
    });

    afterEach(async () => {
      return getProbeResult.destroy({force: true});
    });

    test('/ - 200 Success', async () => {
      const res = await request
        .get(`/api/reports/${report.ident}/probe-results`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      checkProbeResults(res.body);
    });

    test('/{target} - 200 Success', async () => {
      const res = await request
        .get(`/api/reports/${report.ident}/probe-results/${getProbeResult.ident}`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      expect(res.body).not.toBeNull();
      checkProbeResult(res.body);
    });

    test('/{target} - 404 Not Found', async () => {
      // Remove probe result
      await getProbeResult.destroy();

      await request
        .get(`/api/reports/${report.ident}/probe-results/${getProbeResult.ident}`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.NOT_FOUND);
    });
  });

  describe('PUT', () => {
    let putProbeResult;
    let putGene;

    beforeEach(async () => {
      [putProbeResult, putGene] = await Promise.all([
        db.models.probeResults.create({
          ...PROBE_RESULT_DATA, reportId: report.id, geneId: gene.id,
        }),
        db.models.genes.create({
          name: 'PROBE RESULTS PUT TEST GENE',
          reportId: report.id,
        }),
      ]);
    });

    afterEach(async () => {
      return Promise.all([
        putProbeResult.destroy({force: true}),
        putGene.destroy({force: true}),
      ]);
    });

    test('/ - 200 Success - With gene', async () => {
      const res = await request
        .put(`/api/reports/${report.ident}/probe-results/${putProbeResult.ident}`)
        .send({
          ...PROBE_RESULT_UPDATE_DATA,
          gene: putGene.ident,
        })
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      expect(res.body).not.toBeNull();
      checkProbeResult(res.body);
      expect(res.body).toEqual(expect.objectContaining(PROBE_RESULT_UPDATE_DATA));
      expect(res.body.gene.name).toEqual(putGene.name);
    });

    test('/ - 200 Success - Without gene', async () => {
      const res = await request
        .put(`/api/reports/${report.ident}/probe-results/${putProbeResult.ident}`)
        .send(PROBE_RESULT_UPDATE_DATA)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      expect(res.body).not.toBeNull();
      checkProbeResult(res.body);
      expect(res.body).toEqual(expect.objectContaining(PROBE_RESULT_UPDATE_DATA));
    });

    test('/ - 400 Bad Request - Additional Property', async () => {
      await request
        .put(`/api/reports/${report.ident}/probe-results/${putProbeResult.ident}`)
        .send({
          ...PROBE_RESULT_UPDATE_DATA,
          gene: putGene.ident,
          additionalProperty: 'ADDITIONAL_PROPERTY',
        })
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.BAD_REQUEST);
    });

    test('/ - 400 Bad Request - Incorrect field type', async () => {
      await request
        .put(`/api/reports/${report.ident}/probe-results/${putProbeResult.ident}`)
        .send({
          ...PROBE_RESULT_UPDATE_DATA,
          gene: putGene.ident,
          variant: {
            key: 'VALUE',
          },
        })
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.BAD_REQUEST);
    });

    test('/ - 400 Bad Request - Gene is not a UUID', async () => {
      await request
        .put(`/api/reports/${report.ident}/probe-results/${putProbeResult.ident}`)
        .send({
          ...PROBE_RESULT_UPDATE_DATA,
          gene: 'NOT_UUID',
        })
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.BAD_REQUEST);
    });

    test('/ - 404 Not Found - Gene does not exist', async () => {
      await request
        .put(`/api/reports/${report.ident}/probe-results/${putProbeResult.ident}`)
        .send({
          ...PROBE_RESULT_UPDATE_DATA,
          gene: uuidv4(),
        })
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.NOT_FOUND);
    });
  });

  describe('DELETE', () => {
    let deleteProbeResult;

    beforeEach(async () => {
      deleteProbeResult = await db.models.probeResults.create({
        ...PROBE_RESULT_DATA, reportId: report.id, geneId: gene.id,
      });
    });

    afterEach(async () => {
      return deleteProbeResult.destroy({force: true});
    });

    test('/{target} - 204 No Content', async () => {
      await request
        .delete(`/api/reports/${report.ident}/probe-results/${deleteProbeResult.ident}`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.NO_CONTENT);

      // get record check that it is soft-deleted
      const result = await db.models.probeResults.findOne({
        where: {ident: deleteProbeResult.ident},
        paranoid: false,
      });

      expect(result).not.toBeNull();
      expect(result.deletedAt).not.toBeNull();
    });

    test('/{target} - 404 Not Found', async () => {
      await deleteProbeResult.destroy();

      await request
        .delete(`/api/reports/${report.ident}/probe-results/${deleteProbeResult.ident}`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.NOT_FOUND);
    });
  });
});

afterAll(async () => {
  global.gc && global.gc();
  await server.close();
});
