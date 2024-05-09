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

const imageProperties = [
  'ident', 'createdAt', 'updatedAt', 'format', 'filename',
  'key', 'data', 'title', 'caption',
];

const checkImage = (imageObject) => {
  imageProperties.forEach((field) => {
    expect(imageObject).toHaveProperty(field);
  });
  expect(imageObject).toEqual(expect.not.objectContaining({
    id: expect.any(Number),
    reportId: expect.any(Number),
    deletedAt: expect.any(String),
  }));
};

const checkImages = (images) => {
  images.forEach((image) => {
    checkImage(image);
  });
};

// Start API
beforeAll(async () => {
  const port = await getPort({port: CONFIG.get('web:port')});
  server = await listen(port);
  request = supertest(server);
});

describe('/reports/{REPORTID}/image', () => {
  let report;
  let fakeImageData;

  beforeAll(async () => {
    // Get genomic template
    const template = await db.models.template.findOne({where: {name: 'genomic'}});
    // Create test report
    report = await db.models.report.create({
      templateId: template.id,
      patientId: 'PATIENT1234',
    });

    fakeImageData = {
      reportId: report.id,
      filename: 'TestFile.png',
      key: 'cnv.3',
      data: 'TestFileData',
    };
  });

  describe('GET', () => {
    test('/{image} - 200 Success', async () => {
      const image = await db.models.imageData.create(fakeImageData);

      const res = await request
        .get(`/api/reports/${report.ident}/image/${image.ident}`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      // Check that all fields are present and that data is correct
      checkImage(res.body);

      // Remove reportId before checking
      const {reportId, ...imageData} = fakeImageData;
      expect(res.body).toEqual(expect.objectContaining(imageData));

      await db.models.imageData.destroy({where: {id: image.id}, force: true});
    });

    test('/retrieve/:key - 200 Success', async () => {
      const key = 'loh.2';
      const testImage = await db.models.imageData.create({...fakeImageData, key});

      const res = await request
        .get(`/api/reports/${report.ident}/image/retrieve/${key}`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      checkImages(res.body);
      expect(res.body).toEqual(expect.arrayContaining([
        expect.objectContaining({key: expect.stringContaining(key)}),
      ]));

      await db.models.imageData.destroy({where: {ident: testImage.ident}, force: true});
    });

    test('/keylist - 200 Success', async () => {
      const fid1 = {...fakeImageData};
      fid1.key = 'loh.31';
      const testImage1 = await db.models.imageData.create({...fid1});
      fid1.key = 'loh.41';
      const testImage2 = await db.models.imageData.create({...fid1});
      fid1.key = 'cnv.41';
      const testImage3 = await db.models.imageData.create({...fid1});

      const res = await request
        .get(`/api/reports/${report.ident}/image/keylist`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      const keylist = (res.body).map((elem) => {return elem.key;});
      const expectedKeys = ['loh.31', 'loh.41', 'cnv.41'];
      console.dir(keylist);
      expect(keylist.every((elem) => {return (expectedKeys).includes(elem);})).toBe(true);

      await db.models.imageData.destroy({where: {ident: testImage1.ident}, force: true});
      await db.models.imageData.destroy({where: {ident: testImage2.ident}, force: true});
      await db.models.imageData.destroy({where: {ident: testImage3.ident}, force: true});
    });

    test('/keylist/:pattern - 200 Success', async () => {
      const fid1 = {...fakeImageData};
      fid1.key = 'hello.311';
      const testImage1 = await db.models.imageData.create({...fid1});
      fid1.key = 'hello.411';
      const testImage2 = await db.models.imageData.create({...fid1});
      fid1.key = 'world.411';
      const testImage3 = await db.models.imageData.create({...fid1});

      const res = await request
        .get(`/api/reports/${report.ident}/image/keylist/hello`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      const keylist = (res.body).map((elem) => {return elem.key;});
      const expectedKeys = ['hello.311', 'hello.411'];
      expect(keylist.every((elem) => {return (expectedKeys).includes(elem);})).toBe(true);

      await db.models.imageData.destroy({where: {ident: testImage1.ident}, force: true});
      await db.models.imageData.destroy({where: {ident: testImage2.ident}, force: true});
      await db.models.imageData.destroy({where: {ident: testImage3.ident}, force: true});
    });

    test('/subtype-plots - 200 Success', async () => {
      const key = 'subtypePlot.primary';
      const testImage = await db.models.imageData.create({...fakeImageData, key});

      const res = await request
        .get(`/api/reports/${report.ident}/image/subtype-plots`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      checkImages(res.body);
      expect(res.body).toEqual(expect.arrayContaining([
        expect.objectContaining({key: expect.stringContaining('subtypePlot.')}),
      ]));

      await db.models.imageData.destroy({where: {ident: testImage.ident}, force: true});
    });

    test('/mutation-burden - 200 Success', async () => {
      const key = 'mutationBurden.barplot_snv.primary';
      const testImage = await db.models.imageData.create({...fakeImageData, key});

      const res = await request
        .get(`/api/reports/${report.ident}/image/mutation-burden`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      checkImages(res.body);
      expect(res.body).toEqual(expect.arrayContaining([
        expect.objectContaining({key: expect.stringContaining('mutationBurden.')}),
      ]));

      await db.models.imageData.destroy({where: {ident: testImage.ident}, force: true});
    });

    test('/expression-density-graphs - 200 Success', async () => {
      const key = 'expDensity.histogram.CES2';
      const testImage = await db.models.imageData.create({...fakeImageData, key});

      const res = await request
        .get(`/api/reports/${report.ident}/image/expression-density-graphs`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      checkImages(res.body);
      expect(res.body).toEqual(expect.arrayContaining([
        expect.objectContaining({key: expect.stringContaining('expDensity.')}),
      ]));

      await db.models.imageData.destroy({where: {ident: testImage.ident}, force: true});
    });
  });

  describe('POST', () => {
    // Tests for POST endpoints
    test('POST / - 207 Multi-Status successful', async () => {
      const res = await request
        .post(`/api/reports/${report.ident}/image`)
        .attach('cnv.1', 'test/testData/images/golden.jpg')
        .auth(username, password)
        .expect(HTTP_STATUS.MULTI_STATUS);

      // Check returned values match successful upload
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);

      const [result] = res.body;

      expect(result.key).toBe('cnv.1');
      expect(result.upload).toBe('successful');
      expect(result.error).toBe(undefined);
    });

    test('POST / - (With title and caption) 207 Multi-Status successful', async () => {
      const res = await request
        .post(`/api/reports/${report.ident}/image`)
        .attach('cnv.2', 'test/testData/images/golden.jpg')
        .field('cnv.2_title', 'Test title')
        .field('cnv.2_caption', 'Test caption')
        .auth(username, password)
        .expect(HTTP_STATUS.MULTI_STATUS);

      // Check returned values match successful upload
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);

      const [result] = res.body;

      expect(result.key).toBe('cnv.2');
      expect(result.upload).toBe('successful');
      expect(result.error).toBe(undefined);

      // Test that title and caption were added to db
      const imageData = await db.models.imageData.findOne({
        where: {
          reportId: report.id,
          key: 'cnv.2',
        },
      });

      expect(imageData).toEqual(expect.objectContaining({
        format: 'PNG',
        filename: 'golden.jpg',
        key: 'cnv.2',
        title: 'Test title',
        caption: 'Test caption',
      }));
    });

    test('POST / - 400 Bad Request invalid key', async () => {
      const res = await request
        .post(`/api/reports/${report.ident}/image`)
        .attach('INVALID_KEY', 'test/testData/images/golden.jpg')
        .auth(username, password)
        .expect(HTTP_STATUS.BAD_REQUEST);

      // Check invalid key error
      expect(res.body.error).toEqual(expect.objectContaining({
        message: 'Invalid key: INVALID_KEY',
      }));
    });

    test('POST / - 400 Bad Request duplicate key', async () => {
      const res = await request
        .post(`/api/reports/${report.ident}/image`)
        .attach('cnv.1', 'test/testData/images/golden.jpg')
        .attach('cnv.1 ', 'test/testData/images/golden.jpg')
        .auth(username, password)
        .expect(HTTP_STATUS.BAD_REQUEST);

      // Check duplicate key error
      expect(res.body.error).toEqual(expect.objectContaining({
        message: 'Duplicate keys are not allowed. Duplicate key: cnv.1',
      }));
    });

    test.todo('All other POST tests');
  });

  describe('DELETE', () => {
    let image;

    beforeEach(async () => {
      // Create image
      image = await db.models.imageData.create(fakeImageData);
    });

    test('/{image} - 204 No Content - Soft delete', async () => {
      await request
        .delete(`/api/reports/${report.ident}/image/${image.ident}`)
        .auth(username, password)
        .expect(HTTP_STATUS.NO_CONTENT);

      // Check that image was soft deleted
      const deletedImage = await db.models.imageData.findOne({
        where: {id: image.id},
        paranoid: false,
      });

      // Expect record to still exist, but deletedAt now has a date
      expect(deletedImage).toEqual(expect.objectContaining(fakeImageData));
      expect(deletedImage.deletedAt).not.toBeNull();
    });

    test('/{image} - 204 No Content - Hard delete', async () => {
      await request
        .delete(`/api/reports/${report.ident}/image/${image.ident}?force=true`)
        .auth(username, password)
        .expect(HTTP_STATUS.NO_CONTENT);

      // Check that image was hard deleted
      const deletedImage = await db.models.imageData.findOne({
        where: {id: image.id},
        paranoid: false,
      });

      // Expect nothing to be returned
      expect(deletedImage).toBeNull();
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
