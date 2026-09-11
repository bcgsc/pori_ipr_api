const HTTP_STATUS = require('http-status-codes');
const supertest = require('supertest');
const getPort = require('get-port');
const db = require('../../../app/models');

const CONFIG = require('../../../app/config');
const {listen} = require('../../../app');

const {Op} = db.Sequelize;

CONFIG.set('env', 'test');
const {username, password} = CONFIG.get('testing');

let server;
let request;
const TEST_PREFIX = `legend-route-test-${Date.now()}-${process.pid}`;

const legendProperties = [
  'ident', 'createdAt', 'updatedAt', 'format', 'filename',
  'name', 'data', 'default',
];

const checkLegend = (legendObject) => {
  legendProperties.forEach((field) => {
    expect(legendObject).toHaveProperty(field);
  });
  expect(legendObject).toEqual(expect.not.objectContaining({
    id: expect.any(Number),
    reportId: expect.any(Number),
    deletedAt: expect.any(String),
  }));
};

// Start API
beforeAll(async () => {
  const port = await getPort({port: CONFIG.get('web:port')});
  server = await listen(port);
  request = supertest(server);
});

describe('/legend', () => {
  let mockLegendData;

  const buildLegendData = (overrides = {}) => {
    return {
      filename: 'pathway_legend_v1.png',
      name: `${TEST_PREFIX}-v1`,
      data: 'v1Data',
      default: false,
      ...overrides,
    };
  };

  beforeAll(async () => {
    // Create legend
    mockLegendData = buildLegendData();
  });

  afterEach(async () => {
    await db.models.legend.destroy({
      where: {
        name: {[Op.like]: `${TEST_PREFIX}%`},
      },
      force: true,
    });
  });

  describe('GET', () => {
    test('/{legend} - 200 Success', async () => {
      // Create a default legend so the new legend below isn't auto-promoted
      await db.models.legend.create(buildLegendData({default: true}));
      const legend = await db.models.legend.create(mockLegendData);

      const res = await request
        .get(`/api/legend/${legend.ident}`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      // Check that all fields are present and that data is correct
      checkLegend(res.body);

      expect(res.body).toEqual(expect.objectContaining(mockLegendData));
    });

    test('/{legend} - 404 Not Found', async () => {
      await request
        .get('/api/legend/00000000-0000-0000-0000-000000000000')
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.NOT_FOUND);
    });
  });

  describe('POST', () => {
    test('POST / - 207 Multi-Status successful', async () => {
      const uploadFieldName = `${TEST_PREFIX}-v1-upload`;
      const legendName = `${TEST_PREFIX}-v1`;

      const res = await request
        .post('/api/legend')
        .attach(uploadFieldName, 'test/testData/images/pathway_legend_v1.png')
        .field('name', legendName)
        .auth(username, password)
        .expect(HTTP_STATUS.MULTI_STATUS);

      // Check returned values match successful upload
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);

      const [result] = res.body;

      expect(result.name).toBe(uploadFieldName);
      expect(result.upload).toBe('successful');
      expect(result.error).toBe(undefined);

      const legend = await db.models.legend.findOne({where: {name: legendName}});
      expect(legend).toEqual(expect.objectContaining({
        format: 'PNG',
        filename: 'pathway_legend_v1.png',
        name: legendName,
        default: true,
      }));
    });

    test('POST / - default=true promotes new legend as only default', async () => {
      const currentDefault = await db.models.legend.create(buildLegendData({default: true}));
      const uploadFieldName = `${TEST_PREFIX}-golden-upload`;
      const legendName = `${TEST_PREFIX}-Golden-Test`;

      const res = await request
        .post('/api/legend')
        .attach(uploadFieldName, 'test/testData/images/golden.jpg')
        .field('name', legendName)
        .field('default', 'true')
        .auth(username, password)
        .expect(HTTP_STATUS.MULTI_STATUS);

      // Check returned values match successful upload
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);

      const [result] = res.body;

      expect(result.name).toBe(uploadFieldName);
      expect(result.upload).toBe('successful');
      expect(result.error).toBe(undefined);

      const [newDefault, oldDefault] = await Promise.all([
        db.models.legend.findOne({where: {name: legendName}}),
        db.models.legend.findByPk(currentDefault.id),
      ]);

      expect(newDefault.default).toBe(true);
      expect(oldDefault.default).toBe(false);
    });

    test('POST / - 400 Bad Request no files', async () => {
      const res = await request
        .post('/api/legend')
        .auth(username, password)
        .expect(HTTP_STATUS.BAD_REQUEST);

      expect(res.body.error).toEqual(expect.objectContaining({
        message: 'No attached images to upload',
      }));
    });
  });

  describe('DELETE', () => {
    let legend;

    beforeEach(async () => {
      // Create legend
      legend = await db.models.legend.create(mockLegendData);
    });

    test('/{legend} - 204 No Content', async () => {
      await request
        .delete(`/api/legend/${legend.ident}`)
        .auth(username, password)
        .expect(HTTP_STATUS.NO_CONTENT);

      // Check that legend was deleted
      const deletedLegend = await db.models.legend.findOne({
        where: {id: legend.id},
        paranoid: false,
      });

      // Expect nothing to be returned
      expect(deletedLegend).toBeNull();
    });

    test('/{legend} - 204 No Content - Hard delete', async () => {
      await request
        .delete(`/api/legend/${legend.ident}?force=true`)
        .auth(username, password)
        .expect(HTTP_STATUS.NO_CONTENT);

      // Check that legend was hard deleted
      const deletedLegend = await db.models.legend.findOne({
        where: {id: legend.id},
        paranoid: false,
      });

      // Expect nothing to be returned
      expect(deletedLegend).toBeNull();
    });

    test('/{legend} - deleting the only default assigns default to most recent remaining legend', async () => {
      const defaultLegend = await db.models.legend.create(buildLegendData({default: true}));
      const mostRecentLegend = await db.models.legend.create(buildLegendData({default: false}));

      await request
        .delete(`/api/legend/${defaultLegend.ident}`)
        .auth(username, password)
        .expect(HTTP_STATUS.NO_CONTENT);

      const updatedMostRecent = await db.models.legend.findByPk(mostRecentLegend.id);
      expect(updatedMostRecent.default).toBe(true);
    });
  });

  describe('PUT', () => {
    test('/{legend} - setting a legend to default=true unsets previous default', async () => {
      const firstLegend = await db.models.legend.create(buildLegendData({default: true}));
      const secondLegend = await db.models.legend.create(buildLegendData({default: false}));

      await request
        .put(`/api/legend/${secondLegend.ident}`)
        .send({default: true})
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      const [updatedFirstLegend, updatedSecondLegend] = await Promise.all([
        db.models.legend.findByPk(firstLegend.id),
        db.models.legend.findByPk(secondLegend.id),
      ]);

      expect(updatedSecondLegend.default).toBe(true);
      expect(updatedFirstLegend.default).toBe(false);
    });

    test('/{legend} - uploading a new image replaces the stored image', async () => {
      const legend = await db.models.legend.create(
        buildLegendData({data: 'oldData', filename: 'old.png'}),
      );
      const updatedName = `${TEST_PREFIX}-updated-name`;

      const res = await request
        .put(`/api/legend/${legend.ident}`)
        .attach('image', 'test/testData/images/golden.jpg')
        .field('name', updatedName)
        .auth(username, password)
        .expect(HTTP_STATUS.OK);

      checkLegend(res.body);
      expect(res.body.name).toBe(updatedName);
      expect(res.body.filename).toBe('golden.jpg');
      expect(res.body.format).toBe('PNG');
      expect(res.body.data).not.toBe('oldData');

      // The replacement is persisted, not just reflected in the response
      const updated = await db.models.legend.findByPk(legend.id);
      expect(updated.data).not.toBe('oldData');
      expect(updated.filename).toBe('golden.jpg');
    });

    test('/{legend} - metadata-only update preserves the existing image', async () => {
      const legend = await db.models.legend.create(
        buildLegendData({data: 'keepThisData', name: `${TEST_PREFIX}-original`}),
      );
      const renamedValue = `${TEST_PREFIX}-renamed`;

      const res = await request
        .put(`/api/legend/${legend.ident}`)
        .send({name: renamedValue})
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      expect(res.body.name).toBe(renamedValue);
      expect(res.body.data).toBe('keepThisData');

      const updated = await db.models.legend.findByPk(legend.id);
      expect(updated.data).toBe('keepThisData');
    });
  });
});

afterAll(async () => {
  global.gc && global.gc();
  await server.close();
});
