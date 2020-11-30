const HTTP_STATUS = require('http-status-codes');
const supertest = require('supertest');
const getPort = require('get-port');
const db = require('../../../app/models');

const CONFIG = require('../../../app/config');
const {listen} = require('../../../app');

CONFIG.set('env', 'test');
const {username, password} = CONFIG.get('testing');

const BASE_URI = '/api/germline-small-mutation-reports';

let server;
let request;
let testUser;

const mockData = require('../../testData/mockGermlineReportData.json');

const CREATE_DATA = {
  normalLibrary: 'test library',
  sourceVersion: 'v1.0.0',
  sourcePath: '/some/random/source/path',
  exported: false,
  patientId: 'TESTPAT01',
  biopsyName: 'TEST123',
};
const UPDATE_DATA = {
  normalLibrary: 'updated library',
  sourceVersion: 'v2.0.0',
  sourcePath: '/some/random/source/path/updated',
  patientId: 'TESTPAT012345',
  biopsyName: 'TEST12345',
};

const UPLOAD_DATA = {
  normalLibrary: mockData.normalLibrary,
  sourceVersion: mockData.version,
  sourcePath: mockData.source,
  patientId: mockData.patientId,
  biopsyName: mockData.biopsyName,
};

const germlineReportProperties = [
  'ident', 'createdAt', 'updatedAt', 'biopsyName', 'normalLibrary', 'sourceVersion',
  'sourcePath', 'exported', 'biofxAssigned', 'projects', 'variants', 'reviews',
  'patientId',
];

const checkGermlineReport = (reportObject) => {
  germlineReportProperties.forEach((element) => {
    expect(reportObject).toHaveProperty(element);
  });
  expect(reportObject).toEqual(expect.not.objectContaining({
    id: expect.any(Number),
    deletedAt: expect.any(String),
  }));
};

const checkGermlineReports = (reports) => {
  reports.forEach((report) => {
    checkGermlineReport(report);
  });
};

// Template of a GET all reports query for tests
const checkGermlineReportList = expect.objectContaining({
  total: expect.any(Number),
  reports: expect.any(Array),
});

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

describe('/germline-small-mutation-reports', () => {
  let report;

  beforeAll(async () => {
    // create a report to be used in tests
    report = await db.models.germlineSmallMutation.create({
      ...CREATE_DATA, biofxAssignedId: testUser.id,
    });
  });

  describe('GET', () => {
    test('/ - 200 Success', async () => {
      const res = await request
        .get(BASE_URI)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      expect(res.body).toEqual(checkGermlineReportList);
      checkGermlineReports(res.body.reports);
    });

    test('/ - patient query - 200 success', async () => {
      const res = await request
        .get(BASE_URI)
        .query({patientId: 'POG'})
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      expect(res.body).toEqual(checkGermlineReportList);
      expect(res.body.reports).toEqual(expect.arrayContaining([
        expect.objectContaining({patientId: expect.stringContaining('POG')}),
      ]));
    });

    test('/ - biopsy name query - 200 success', async () => {
      const res = await request
        .get(BASE_URI)
        .query({biopsyName: 'biop1'})
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      expect(res.body).toEqual(checkGermlineReportList);
      expect(res.body.reports).toEqual(expect.arrayContaining([
        expect.objectContaining({biopsyName: expect.stringContaining('biop1')}),
      ]));
    });

    test('/ - project query - 200 success', async () => {
      const res = await request
        .get(BASE_URI)
        .query({project: 'POG'})
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      expect(res.body).toEqual(checkGermlineReportList);
      expect(res.body.reports).toEqual(expect.arrayContaining([
        expect.objectContaining({
          projects: expect.arrayContaining([
            expect.objectContaining({name: expect.stringContaining('POG')}),
          ]),
        }),
      ]));
    });

    test('/ - limit and offset - 200 success', async () => {
      const res = await request
        .get(BASE_URI)
        .query({limit: 3, offset: 5})
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      expect(res.body).toEqual(checkGermlineReportList);
      expect(res.body.reports.length).toEqual(3);

      const {body: {reports}} = res;

      // Test offset
      const results = await db.models.germlineSmallMutation.scope('public').findAll({limit: 3, offset: 5});
      for (let i = 0; i < results.length; i++) {
        expect(reports[i].ident).toBe(results[i].ident);
      }
    });

    test('/{gsm_report} - 200 Success', async () => {
      const res = await request
        .get(`${BASE_URI}/${report.ident}`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      checkGermlineReport(res.body);
      expect(res.body).toEqual(expect.objectContaining(CREATE_DATA));
    });
  });

  describe('POST', () => {
    test('/ - 201 Created', async () => {
      const res = await request
        .post(BASE_URI)
        .send(mockData)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.CREATED);

      checkGermlineReport(res.body);
      expect(res.body).toEqual(expect.objectContaining(UPLOAD_DATA));

      // Check that record was created in the db
      const result = await db.models.germlineSmallMutation.findOne({where: {ident: res.body.ident}});
      expect(result).not.toBeNull();
    });

    test('/ - project is required - 400 Bad Request', async () => {
      const {project, ...testData} = mockData;
      await request
        .post(BASE_URI)
        .auth(username, password)
        .type('json')
        .send(testData)
        .expect(HTTP_STATUS.BAD_REQUEST);
    });

    test('/ - source is required - 400 Bad Request', async () => {
      const {source, ...testData} = mockData;
      await request
        .post(BASE_URI)
        .auth(username, password)
        .type('json')
        .send(testData)
        .expect(HTTP_STATUS.BAD_REQUEST);
    });

    test('/ - version is required - 400 Bad Request', async () => {
      const {version, ...testData} = mockData;
      await request
        .post(BASE_URI)
        .auth(username, password)
        .type('json')
        .send(testData)
        .expect(HTTP_STATUS.BAD_REQUEST);
    });
  });

  describe('PUT', () => {
    let germlineReportUpdate;

    beforeEach(async () => {
      germlineReportUpdate = await db.models.germlineSmallMutation.create({
        ...CREATE_DATA, biofxAssignedId: testUser.id,
      });
    });

    afterEach(async () => {
      await db.models.germlineSmallMutation.destroy({where: {ident: germlineReportUpdate.ident}, force: true});
    });

    test('/{gsm_report} - 200 Success', async () => {
      const res = await request
        .put(`${BASE_URI}/${germlineReportUpdate.ident}`)
        .send({...UPDATE_DATA, assignToMe: true})
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      checkGermlineReport(res.body);
      expect(res.body).toEqual(expect.objectContaining(UPDATE_DATA));
    });

    test('/{gsm_report} - 400 Bad Request Failed Validation', async () => {
      await request
        .put(`${BASE_URI}/${germlineReportUpdate.ident}`)
        .send({...UPDATE_DATA, id: 6})
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.BAD_REQUEST);
    });

    test('/{gsm_report} - 404 Not Found no variant data to update', async () => {
      // First soft-delete record
      await db.models.germlineSmallMutation.destroy({where: {ident: germlineReportUpdate.ident}});

      await request
        .put(`${BASE_URI}/${germlineReportUpdate.ident}`)
        .send(UPDATE_DATA)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.NOT_FOUND);
    });
  });

  describe('DELETE', () => {
    let germlineReportDelete;

    beforeEach(async () => {
      germlineReportDelete = await db.models.germlineSmallMutation.create({
        ...CREATE_DATA, biofxAssignedId: testUser.id,
      });
    });

    afterEach(async () => {
      await db.models.germlineSmallMutation.destroy({
        where: {ident: germlineReportDelete.ident}, force: true,
      });
    });

    test('/{gsm_report} - 204 No content', async () => {
      await request
        .delete(`${BASE_URI}/${germlineReportDelete.ident}`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.NO_CONTENT);

      // Verify that the record was deleted
      const result = await db.models.germlineSmallMutation.findOne({where: {id: germlineReportDelete.id}});
      expect(result).toBeNull();
    });

    test('/{gsm_report} - 400 Bad Request', async () => {
      await request
        .delete(`${BASE_URI}/NOT_AN_EXISTING_RECORD`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.BAD_REQUEST);
    });

    test('/{gsm_report} - 404 Not Found no germline report to delete', async () => {
      // First soft-delete record
      await db.models.germlineSmallMutation.destroy({where: {ident: germlineReportDelete.ident}});

      await request
        .delete(`${BASE_URI}/${germlineReportDelete.ident}`)
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
