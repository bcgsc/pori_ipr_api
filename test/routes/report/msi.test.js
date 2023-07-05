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

const CREATE_DATA = {
  score: 23.5,
  kbCategory: 'moderate',
  comments: 'Initial Comment',
  displayName: 'display name',
};
const UPDATE_DATA = {
  score: 89.5,
  kbCategory: 'updated category',
  comments: 'Updated Comment',
  displayName: 'New display name',
};

const msiProperties = [
  'ident', 'createdAt', 'updatedAt', 'score', 'kbCategory', 'comments', 'displayName',
];

const checkMsi = (msiObject) => {
  msiProperties.forEach((element) => {
    expect(msiObject).toHaveProperty(element);
  });
  expect(msiObject).toEqual(expect.not.objectContaining({
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

describe('/reports/{REPORTID}/msi', () => {
  let report;
  let msi;

  beforeAll(async () => {
    // Get genomic template
    const template = await db.models.template.findOne({where: {name: 'genomic'}});
    // create a report to be used in tests
    report = await db.models.report.create({
      templateId: template.id,
      patientId: 'PATIENT1234',
    });

    // Create initial msi data
    msi = await db.models.msi.create({...CREATE_DATA, reportId: report.id});
  });

  describe('GET', () => {
    test('/ - 200 Success', async () => {
      const res = await request
        .get(`/api/reports/${report.ident}/msi`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);

      const [entry] = res.body;

      checkMsi(entry);

      expect(entry).toEqual(expect.objectContaining(CREATE_DATA));
    });

    test('/{msi} - 200 Success', async () => {
      const res = await request
        .get(`/api/reports/${report.ident}/msi/${msi.ident}`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      checkMsi(res.body);
      expect(res.body).toEqual(expect.objectContaining(CREATE_DATA));
    });
  });

  describe('POST', () => {
    test('/ - 201 Created', async () => {
      const res = await request
        .post(`/api/reports/${report.ident}/msi`)
        .send(CREATE_DATA)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.CREATED);

      checkMsi(res.body);
      expect(res.body).toEqual(expect.objectContaining(CREATE_DATA));

      // Check that record was created in the db
      let result = await db.models.msi.findOne({where: {ident: res.body.ident}});
      expect(result).not.toBeNull();

      // Get public view of direct db query for testing
      result = result.view('public');

      checkMsi(result);
      expect(result).toEqual(expect.objectContaining(CREATE_DATA));
    });
  });

  describe('PUT', () => {
    let msiUpdate;

    beforeEach(async () => {
      msiUpdate = await db.models.msi.create({...CREATE_DATA, reportId: report.id});
    });

    afterEach(async () => {
      await db.models.msi.destroy({where: {ident: msiUpdate.ident}, force: true});
    });

    test('/{msi} - 200 Success', async () => {
      const res = await request
        .put(`/api/reports/${report.ident}/msi/${msiUpdate.ident}`)
        .send(UPDATE_DATA)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      checkMsi(res.body);
      expect(res.body).toEqual(expect.objectContaining(UPDATE_DATA));
    });

    test('/{msi} - 400 Bad Request Failed Validation', async () => {
      await request
        .put(`/api/reports/${report.ident}/msi/${msiUpdate.ident}`)
        .send({...UPDATE_DATA, id: 6})
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.BAD_REQUEST);
    });

    test('/{msi} - 404 Not Found No MSI data to update', async () => {
      // First soft-delete record
      await db.models.msi.destroy({where: {ident: msiUpdate.ident}});

      await request
        .put(`/api/reports/${report.ident}/msi/${msiUpdate.ident}`)
        .send(UPDATE_DATA)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.NOT_FOUND);
    });
  });

  describe('DELETE', () => {
    let msiDelete;

    beforeEach(async () => {
      msiDelete = await db.models.msi.create({...CREATE_DATA, reportId: report.id});
    });

    afterEach(async () => {
      await db.models.msi.destroy({where: {ident: msiDelete.ident}, force: true});
    });

    test('/{msi} - 204 No content', async () => {
      await request
        .delete(`/api/reports/${report.ident}/msi/${msiDelete.ident}`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.NO_CONTENT);

      // Verify that the record was deleted
      const result = await db.models.msi.findOne({where: {id: msiDelete.id}});

      expect(result).toBeNull();
    });

    test('/{msi} - 404 Not Found No msi data to delete', async () => {
      // First soft-delete record
      await db.models.msi.destroy({where: {ident: msiDelete.ident}});

      await request
        .delete(`/api/reports/${report.ident}/msi/${msiDelete.ident}`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.NOT_FOUND);
    });
  });

  // delete report
  afterAll(async () => {
    // delete newly created report and all of it's components
    // indirectly by hard deleting newly created patient
    await db.models.report.destroy({where: {ident: report.ident}, force: true});

    // verify report is deleted
    const result = await db.models.report.findOne({where: {ident: report.ident}, paranoid: false});
    expect(result).toBeNull();
  });
});

afterAll(async () => {
  await server.close();
});
