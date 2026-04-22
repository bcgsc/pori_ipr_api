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

const legendProperties = [
  'ident', 'createdAt', 'updatedAt', 'format', 'filename',
  'version', 'data', 'title', 'caption',
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

const checkLegends = (legends) => {
  legends.forEach((legend) => {
    checkLegend(legend);
  });
};

// Start API
beforeAll(async () => {
  const port = await getPort({port: CONFIG.get('web:port')});
  server = await listen(port);
  request = supertest(server);
});

describe('/reports/{REPORTID}/legend', () => {
  let report;
  let fakeLegendData;

  beforeAll(async () => {
    // Get genomic template
    const template = await db.models.template.findOne({where: {name: 'genomic'}});
    // Create test report
    report = await db.models.report.create({
      templateId: template.id,
      patientId: 'PATIENT1234',
    });

    fakeLegendData = {
      reportId: report.id,
      filename: 'TestFile.png',
      version: 'v1',
      data: 'TestFileData',
    };
  });

  describe('GET', () => {
    test('/{legend} - 200 Success', async () => {
      const legend = await db.models.legend.create(fakeLegendData);

      const res = await request
        .get(`/api/reports/${report.ident}/legend/${legend.ident}`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      // Check that all fields are present and that data is correct
      checkLegend(res.body);

      // Remove reportId before checking
      const {reportId, ...legendData} = fakeLegendData;
      expect(res.body).toEqual(expect.objectContaining(legendData));

      await db.models.legend.destroy({where: {id: legend.id}, force: true});
    });

    test('/retrieve/:version - 200 Success', async () => {
      const version = 'v1';
      const testLegend = await db.models.legend.create({...fakeLegendData, version});

      const res = await request
        .get(`/api/reports/${report.ident}/legend/retrieve/${version}`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      checkLegends(res.body);
      expect(res.body).toEqual(expect.arrayContaining([
        expect.objectContaining({version: expect.stringContaining(version)}),
      ]));

      await db.models.legend.destroy({where: {ident: testLegend.ident}, force: true});
    });

    test('/{legend} - 404 Not Found', async () => {
      await request
        .get(`/api/reports/${report.ident}/legend/00000000-0000-0000-0000-000000000000`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.NOT_FOUND);
    });

    test('/versionlist - 200 Success', async () => {
      const legend1 = await db.models.legend.create({...fakeLegendData, version: 'v1'});
      const legend2 = await db.models.legend.create({...fakeLegendData, version: 'v2'});
      const legend3 = await db.models.legend.create({...fakeLegendData, version: 'v3'});

      const res = await request
        .get(`/api/reports/${report.ident}/legend/versionlist`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      const versionlist = res.body.map((elem) => {return elem.version;});
      const expectedVersions = ['v1', 'v2', 'v3'];
      expect(versionlist.every((elem) => {return expectedVersions.includes(elem);})).toBe(true);

      await db.models.legend.destroy({where: {ident: legend1.ident}, force: true});
      await db.models.legend.destroy({where: {ident: legend2.ident}, force: true});
      await db.models.legend.destroy({where: {ident: legend3.ident}, force: true});
    });
  });

  describe('POST', () => {
    test('POST / - 207 Multi-Status successful', async () => {
      const res = await request
        .post(`/api/reports/${report.ident}/legend`)
        .attach('v1', 'test/testData/images/golden.jpg')
        .auth(username, password)
        .expect(HTTP_STATUS.MULTI_STATUS);

      // Check returned values match successful upload
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);

      const [result] = res.body;

      expect(result.version).toBe('v1');
      expect(result.upload).toBe('successful');
      expect(result.error).toBe(undefined);
    });

    test('POST / - (With title and caption) 207 Multi-Status successful', async () => {
      const res = await request
        .post(`/api/reports/${report.ident}/legend`)
        .attach('v2', 'test/testData/images/golden.jpg')
        .field('v2_title', 'Test title')
        .field('v2_caption', 'Test caption')
        .auth(username, password)
        .expect(HTTP_STATUS.MULTI_STATUS);

      // Check returned values match successful upload
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);

      const [result] = res.body;

      expect(result.version).toBe('v2');
      expect(result.upload).toBe('successful');
      expect(result.error).toBe(undefined);

      // Test that title and caption were added to db
      const legendData = await db.models.legend.findOne({
        where: {
          reportId: report.id,
          version: 'v2',
        },
      });

      expect(legendData).toEqual(expect.objectContaining({
        format: 'PNG',
        filename: 'golden.jpg',
        version: 'v2',
        title: 'Test title',
        caption: 'Test caption',
      }));
    });

    test('POST / - 400 Bad Request duplicate version', async () => {
      const res = await request
        .post(`/api/reports/${report.ident}/legend`)
        .attach('v1', 'test/testData/images/golden.jpg')
        .attach('v1 ', 'test/testData/images/golden.jpg')
        .auth(username, password)
        .expect(HTTP_STATUS.BAD_REQUEST);

      // Check duplicate version error
      expect(res.body.error).toEqual(expect.objectContaining({
        message: 'Duplicate versions are not allowed. Duplicate version: v1',
      }));
    });

    test('POST / - 400 Bad Request no files', async () => {
      const res = await request
        .post(`/api/reports/${report.ident}/legend`)
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
      legend = await db.models.legend.create(fakeLegendData);
    });

    test('/{legend} - 204 No Content - Soft delete', async () => {
      await request
        .delete(`/api/reports/${report.ident}/legend/${legend.ident}`)
        .auth(username, password)
        .expect(HTTP_STATUS.NO_CONTENT);

      // Check that legend was soft deleted
      const deletedLegend = await db.models.legend.findOne({
        where: {id: legend.id},
        paranoid: false,
      });

      // Expect record to still exist, but deletedAt now has a date
      expect(deletedLegend).toEqual(expect.objectContaining(fakeLegendData));
      expect(deletedLegend.deletedAt).not.toBeNull();
    });

    test('/{legend} - 204 No Content - Hard delete', async () => {
      await request
        .delete(`/api/reports/${report.ident}/legend/${legend.ident}?force=true`)
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
  });

  afterAll(async () => {
    // Delete newly created report and all of it's components
    // indirectly by force deleting the report
    return db.models.report.destroy({where: {ident: report.ident}, force: true});
  });
});

afterAll(async () => {
  global.gc && global.gc();
  await server.close();
});
