const HTTP_STATUS = require('http-status-codes');
const supertest = require('supertest');
const getPort = require('get-port');

const db = require('../../../../app/models');

const {Op} = db.Sequelize;
const CONFIG = require('../../../../app/config');
const {listen} = require('../../../../app');

CONFIG.set('env', 'test');
jest.setTimeout(20000);
const {username, password} = CONFIG.get('testing');

let server;
let request;

const pathwayProperties = ['ident', 'createdAt', 'updatedAt', 'pathway', 'legendId'];

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
  const TEST_SUFFIX = `${Date.now()}-${process.pid}`;

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
    let legend;

    beforeEach(async () => {
      pathwayAnalysis = await db.models.pathwayAnalysis.create({
        reportId: report.id,
      });
      legend = await db.models.legend.create({
        filename: 'pathway_legend_v1.png',
        name: `put-legend-${TEST_SUFFIX}`,
        data: 'v1Data',
        default: false,
      });
    });

    // Delete pathway analysis
    afterEach(async () => {
      await db.models.pathwayAnalysis.destroy({where: {ident: pathwayAnalysis.ident}, force: true});
      await db.models.legend.destroy({where: {id: legend.id}, force: true});
    });

    test('/ - 200 Success', async () => {
      const res = await request
        .put(`/api/reports/${report.ident}/summary/pathway-analysis`)
        .auth(username, password)
        .type('json')
        .attach('pathway', 'test/testData/images/pathwayAnalysisData.svg')
        .field('legendId', legend.id)
        .expect(HTTP_STATUS.OK);

      checkPathwayAnalysis(res.body);

      expect(res.body.pathway).not.toBeNull();
      expect(res.body.legendId).toBe(legend.id);
    });

    test('/ - 400 Bad request - Invalid legend fk', async () => {
      await request
        .put(`/api/reports/${report.ident}/summary/pathway-analysis`)
        .auth(username, password)
        .type('json')
        .send({legendId: 'Not valid legend id'})
        .expect(HTTP_STATUS.BAD_REQUEST);
    });

    test('/ - 400 Bad request - Invalid pathway image', async () => {
      await request
        .put(`/api/reports/${report.ident}/summary/pathway-analysis`)
        .auth(username, password)
        .type('json')
        .attach('pathway', 'test/testData/images/golden.jpg')
        .field('legendId', legend.id)
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
    let legend;

    beforeEach(async () => {
      legend = await db.models.legend.create({
        filename: 'pathway_legend_v1.png',
        name: `post-legend-${TEST_SUFFIX}`,
        data: 'v1Data',
        default: false,
      });
    });

    afterEach(async () => {
      await db.models.legend.destroy({where: {id: legend.id}, force: true});
    });

    test('/ - 201 Created', async () => {
      const res = await request
        .post(`/api/reports/${report.ident}/summary/pathway-analysis`)
        .auth(username, password)
        .type('json')
        .attach('pathway', 'test/testData/images/pathwayAnalysisData.svg')
        .field('legendId', legend.id)
        .expect(HTTP_STATUS.CREATED);

      checkPathwayAnalysis(res.body);

      expect(res.body.pathway).not.toBeNull();
      expect(res.body.legendId).toBe(legend.id);

      // Remove pathway analysis
      await db.models.pathwayAnalysis.destroy({where: {ident: res.body.ident}});
    });

    test('/ - 201 Created - Default legend automatically associated', async () => {
      await db.models.legend.update({default: false}, {where: {id: legend.id}});
      const defaultLegend = await db.models.legend.create({
        filename: 'pathway_legend_v1.png',
        name: `default-legend-${TEST_SUFFIX}`,
        data: 'v1Data',
        default: true,
      });

      const res = await request
        .post(`/api/reports/${report.ident}/summary/pathway-analysis`)
        .auth(username, password)
        .type('json')
        .attach('pathway', 'test/testData/images/pathwayAnalysisData.svg')
        .expect(HTTP_STATUS.CREATED);

      checkPathwayAnalysis(res.body);

      expect(res.body.pathway).not.toBeNull();
      expect(res.body.legendId).toBe(defaultLegend.id);

      // Remove pathway analysis
      await db.models.pathwayAnalysis.destroy({where: {ident: res.body.ident}});
      await db.models.legend.destroy({where: {id: defaultLegend.id}, force: true});
    });

    test('/ - 201 Created - No legend records and no legendId', async () => {
      await db.models.legend.destroy({where: {}, force: true});

      const res = await request
        .post(`/api/reports/${report.ident}/summary/pathway-analysis`)
        .auth(username, password)
        .type('json')
        .attach('pathway', 'test/testData/images/pathwayAnalysisData.svg')
        .expect(HTTP_STATUS.CREATED);

      checkPathwayAnalysis(res.body);

      expect(res.body.pathway).not.toBeNull();
      expect(res.body.legendId).toBeNull();

      // Remove pathway analysis
      await db.models.pathwayAnalysis.destroy({where: {ident: res.body.ident}});
    });

    test('/ - 400 Bad request - Invalid legend id', async () => {
      await request
        .post(`/api/reports/${report.ident}/summary/pathway-analysis`)
        .auth(username, password)
        .type('json')
        .attach('pathway', 'test/testData/images/pathwayAnalysisData.svg')
        .field('legendId', 'Not valid legend id')
        .expect(HTTP_STATUS.BAD_REQUEST);
    });

    test('/ - 400 Bad request - Invalid pathway image', async () => {
      await request
        .post(`/api/reports/${report.ident}/summary/pathway-analysis`)
        .auth(username, password)
        .type('json')
        .attach('pathway', 'test/testData/images/golden.jpg')
        .field('legendId', legend.id)
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
        .field('legendId', legend.id)
        .expect(HTTP_STATUS.CONFLICT);

      // Remove pathway analysis
      await db.models.pathwayAnalysis.destroy({where: {ident: pathwayAnalysis.ident}});
    });
  });

  // Delete report
  afterAll(async () => {
    await db.models.pathwayAnalysis.destroy({where: {reportId: report.id}, force: true});
    await db.models.legend.destroy({
      where: {
        name: {
          [Op.or]: [
            {[Op.like]: `put-legend-${TEST_SUFFIX}%`},
            {[Op.like]: `post-legend-${TEST_SUFFIX}%`},
            {[Op.like]: `default-legend-${TEST_SUFFIX}%`},
          ],
        },
      },
      force: true,
    });
    await db.models.report.destroy({where: {id: report.id}, force: true});
  });
});

afterAll(async () => {
  global.gc && global.gc();
  await server.close();
});
