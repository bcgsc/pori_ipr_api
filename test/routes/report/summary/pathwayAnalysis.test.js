const HTTP_STATUS = require('http-status-codes');
const supertest = require('supertest');
const getPort = require('get-port');

const db = require('../../../../app/models');
const CONFIG = require('../../../../app/config');
const {listen} = require('../../../../app');

CONFIG.set('env', 'test');
const {username, password} = CONFIG.get('testing');

let server;
let request;

const pathwayProperties = ['ident', 'createdAt', 'updatedAt', 'pathway', 'legend'];

const checkPathwayAnalysis = (pathwayObject) => {
  pathwayProperties.forEach((element) => {
    expect(pathwayObject).toHaveProperty(element);
  });
  expect(pathwayObject).not.toHaveProperty('id');
  expect(pathwayObject).not.toHaveProperty('deletedAt');
  expect(pathwayObject).not.toHaveProperty('reportId');
};

// Start API
beforeAll(async () => {
  const port = await getPort({port: CONFIG.get('web:port')});
  server = await listen(port);
  request = supertest(server);
});

describe('/reports/{report}/summary/pathway-analysis', () => {
  let report;

  beforeAll(async () => {
    // Get genomic template
    const template = await db.models.template.findOne({where: {name: 'genomic'}});
    // Create Report and Mutation Summary
    report = await db.models.report.create({
      templateId: template.id,
      patientId: 'TESTPATIENT1234',
    });
  });

  describe('GET', () => {
    let pathwayAnalysis;

    beforeEach(async () => {
      pathwayAnalysis = await db.models.pathwayAnalysis.create({
        reportId: report.id,
      });
    });

    // Delete pathway analysis
    afterEach(async () => {
      await db.models.pathwayAnalysis.destroy({where: {ident: pathwayAnalysis.ident}, force: true});
    });

    test('/ - 200 Success', async () => {
      const res = await request
        .get(`/api/reports/${report.ident}/summary/pathway-analysis`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      checkPathwayAnalysis(res.body);
      expect(res.body.ident).toBe(pathwayAnalysis.ident);
    });
  });

  describe('PUT', () => {
    let pathwayAnalysis;

    beforeEach(async () => {
      pathwayAnalysis = await db.models.pathwayAnalysis.create({
        reportId: report.id,
      });
    });

    // Delete pathway analysis
    afterEach(async () => {
      await db.models.pathwayAnalysis.destroy({where: {ident: pathwayAnalysis.ident}, force: true});
    });

    test('/ - 200 Success', async () => {
      const res = await request
        .put(`/api/reports/${report.ident}/summary/pathway-analysis`)
        .auth(username, password)
        .type('json')
        .attach('pathway', 'test/testData/images/pathwayAnalysisData.svg')
        .field('legend', 'v2')
        .expect(HTTP_STATUS.OK);

      checkPathwayAnalysis(res.body);

      expect(res.body.pathway).not.toBeNull();
      expect(res.body.legend).toBe('v2');
    });

    test('/ - 400 Bad request - Invalid legend', async () => {
      await request
        .put(`/api/reports/${report.ident}/summary/pathway-analysis`)
        .auth(username, password)
        .type('json')
        .send({legend: 'Not valid legend'})
        .expect(HTTP_STATUS.BAD_REQUEST);
    });

    test('/ - 400 Bad request - Invalid pathway image', async () => {
      await request
        .put(`/api/reports/${report.ident}/summary/pathway-analysis`)
        .auth(username, password)
        .type('json')
        .attach('pathway', 'test/testData/images/golden.jpg')
        .field('legend', 'v1')
        .expect(HTTP_STATUS.BAD_REQUEST);
    });

    test('/ - 404 Not found', async () => {
      await db.models.pathwayAnalysis.destroy({where: {ident: pathwayAnalysis.ident}});

      await request
        .put(`/api/reports/${report.ident}/summary/pathway-analysis`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.NOT_FOUND);
    });
  });

  describe('DELETE', () => {
    let pathwayAnalysis;

    beforeEach(async () => {
      pathwayAnalysis = await db.models.pathwayAnalysis.create({
        reportId: report.id,
      });
    });

    // Delete pathway analysis
    afterEach(async () => {
      await db.models.pathwayAnalysis.destroy({where: {ident: pathwayAnalysis.ident}, force: true});
    });

    test('/ - 204 No Content', async () => {
      await request
        .delete(`/api/reports/${report.ident}/summary/pathway-analysis`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.NO_CONTENT);

      // Verify analysis is deleted
      const result = await db.models.pathwayAnalysis.findOne({where: {ident: pathwayAnalysis.ident}});
      expect(result).toBeNull();
    });

    test('/ - 404 Not found', async () => {
      // Delete pathway analysis first
      await db.models.pathwayAnalysis.destroy({where: {ident: pathwayAnalysis.ident}});

      await request
        .delete(`/api/reports/${report.ident}/summary/pathway-analysis`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.NOT_FOUND);
    });
  });

  describe('POST', () => {
    test('/ - 201 Created', async () => {
      const res = await request
        .post(`/api/reports/${report.ident}/summary/pathway-analysis`)
        .auth(username, password)
        .type('json')
        .attach('pathway', 'test/testData/images/pathwayAnalysisData.svg')
        .field('legend', 'custom')
        .expect(HTTP_STATUS.CREATED);

      checkPathwayAnalysis(res.body);

      expect(res.body.pathway).not.toBeNull();
      expect(res.body.legend).toBe('custom');

      // Remove pathway analysis
      await db.models.pathwayAnalysis.destroy({where: {ident: res.body.ident}});
    });

    test('/ - 400 Bad request - Invalid legend', async () => {
      await request
        .post(`/api/reports/${report.ident}/summary/pathway-analysis`)
        .auth(username, password)
        .type('json')
        .attach('pathway', 'test/testData/images/pathwayAnalysisData.svg')
        .field('legend', 'Not valid legend')
        .expect(HTTP_STATUS.BAD_REQUEST);
    });

    test('/ - 400 Bad request - Invalid pathway image', async () => {
      await request
        .post(`/api/reports/${report.ident}/summary/pathway-analysis`)
        .auth(username, password)
        .type('json')
        .attach('pathway', 'test/testData/images/golden.jpg')
        .field('legend', 'v1')
        .expect(HTTP_STATUS.BAD_REQUEST);
    });

    test('/ - 409 Conflict', async () => {
      // Create pathway analysis
      const pathwayAnalysis = await db.models.pathwayAnalysis.create({
        reportId: report.id,
      });

      await request
        .post(`/api/reports/${report.ident}/summary/pathway-analysis`)
        .auth(username, password)
        .type('json')
        .attach('pathway', 'test/testData/images/pathwayAnalysisData.svg')
        .field('legend', 'v2')
        .expect(HTTP_STATUS.CONFLICT);

      // Remove pathway analysis
      await db.models.pathwayAnalysis.destroy({where: {ident: pathwayAnalysis.ident}});
    });
  });

  // Delete report
  afterAll(async () => {
    await db.models.report.destroy({where: {id: report.id}, force: true});
  });
});

afterAll(async () => {
  global.gc && global.gc();
  await server.close();
});
