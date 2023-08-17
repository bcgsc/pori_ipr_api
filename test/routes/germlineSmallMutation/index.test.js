const HTTP_STATUS = require('http-status-codes');
const supertest = require('supertest');
const getPort = require('get-port');
const db = require('../../../app/models');

const CONFIG = require('../../../app/config');
const {listen} = require('../../../app');

CONFIG.set('env', 'test');
const {username, password} = CONFIG.get('testing');

const BASE_URI = '/api/germline-small-mutation-reports';

jest.mock('../../../app/middleware/auth.js');

let server;
let request;
let testUser;

const mockData = require('../../testData/mockGermlineReportData.json');

const NON_AUTHORIZED_GROUP = 'NON AUTHORIZED GROUP';
const AUTHORIZED_GROUP = 'Non-Production Access';

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
  'sourcePath', 'exported', 'biofxAssigned', 'projects', 'users', 'variants', 'reviews',
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

const hasNonProdReport = (reports) => {
  return reports.some((report) => {
    return report.state === 'nonproduction';
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
  let nonProdReport;

  let realProject;
  let fakeProject;

  const reports = [];
  const projects = [];

  beforeAll(async () => {
    // create a bunch of reports to be used in tests
    report = await db.models.germlineSmallMutation.create({
      ...CREATE_DATA, biofxAssignedId: testUser.id,
    });

    reports.push(report);

    // Create projects
    fakeProject = await db.models.project.create({
      name: 'Fake project',
    });

    projects.push(fakeProject);

    realProject = await db.models.project.create({
      name: 'Real project',
    });

    projects.push(realProject);

    // Create a bunch of reports
    const report2 = await db.models.germlineSmallMutation.create({
      ...CREATE_DATA,
      biofxAssignedId: testUser.id,
      patientId: 'Patient002',
      biopsyName: 'biopsy002',
    });

    reports.push(report2);

    await db.models.germlineReportsToProjects.create({
      germlineReportId: report2.id,
      projectId: fakeProject.id,
    });

    await db.models.germlineSmallMutationReview.create({
      reviewerId: testUser.id,
      germlineReportId: report2.id,
      type: 'biofx',
    });

    const report3 = await db.models.germlineSmallMutation.create({
      ...CREATE_DATA,
      biofxAssignedId: testUser.id,
      patientId: 'Client001',
      biopsyName: 'biopsy003',
    });

    reports.push(report3);

    await db.models.germlineReportsToProjects.create({
      germlineReportId: report3.id,
      projectId: fakeProject.id,
    });

    await db.models.germlineSmallMutationReview.create({
      reviewerId: testUser.id,
      germlineReportId: report3.id,
      type: 'projects',
    });

    const report4 = await db.models.germlineSmallMutation.create({
      ...CREATE_DATA,
      biofxAssignedId: testUser.id,
      patientId: 'Client002',
      biopsyName: 'sample001',
    });

    reports.push(report4);

    await db.models.germlineReportsToProjects.create({
      germlineReportId: report4.id,
      projectId: realProject.id,
    });

    await db.models.germlineSmallMutationReview.create({
      reviewerId: testUser.id,
      germlineReportId: report4.id,
      type: 'diff',
    });

    const report5 = await db.models.germlineSmallMutation.create({
      ...CREATE_DATA,
      biofxAssignedId: testUser.id,
      patientId: 'Admin001',
      biopsyName: 'sample002',
    });

    reports.push(report5);

    await db.models.germlineReportsToProjects.create({
      germlineReportId: report5.id,
      projectId: realProject.id,
    });

    await db.models.germlineSmallMutationReview.create({
      reviewerId: testUser.id,
      germlineReportId: report5.id,
      type: 'biofx',
    });

    nonProdReport = await db.models.germlineSmallMutation.create({
      ...CREATE_DATA,
      biofxAssignedId: testUser.id,
      patientId: 'Admin001',
      biopsyName: 'sample002',
      state: 'nonproduction',
    });

    reports.push(nonProdReport);

    await db.models.germlineReportsToProjects.create({
      germlineReportId: nonProdReport.id,
      projectId: realProject.id,
    });

    await db.models.germlineSmallMutationReview.create({
      reviewerId: testUser.id,
      germlineReportId: nonProdReport.id,
      type: 'biofx',
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
        .query({patientId: 'Patient'})
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      expect(res.body).toEqual(checkGermlineReportList);
      expect(res.body.reports).toEqual(expect.arrayContaining([
        expect.objectContaining({patientId: expect.stringContaining('Patient')}),
      ]));
    });

    test('/ - biopsy name query - 200 success', async () => {
      const res = await request
        .get(BASE_URI)
        .query({biopsyName: 'biopsy'})
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      expect(res.body).toEqual(checkGermlineReportList);
      expect(res.body.reports).toEqual(expect.arrayContaining([
        expect.objectContaining({biopsyName: expect.stringContaining('biopsy')}),
      ]));
    });

    test('/ - project query - 200 success', async () => {
      const res = await request
        .get(BASE_URI)
        .query({project: 'Real project'})
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      expect(res.body).toEqual(checkGermlineReportList);
      expect(res.body.reports).toEqual(expect.arrayContaining([
        expect.objectContaining({
          projects: expect.arrayContaining([
            expect.objectContaining({name: expect.stringContaining('Real project')}),
          ]),
        }),
      ]));
    });

    test('/ - limit and offset - 200 success', async () => {
      const res = await request
        .get(BASE_URI)
        .query({limit: 3, offset: 1})
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      expect(res.body).toEqual(checkGermlineReportList);
      expect(res.body.reports.length).toEqual(3);

      const {body: {reports: germReports}} = res;

      // Test offset
      const results = await db.models.germlineSmallMutation.scope('public').findAll({limit: 3, offset: 1});
      for (let i = 0; i < results.length; i++) {
        expect(germReports[i].ident).toBe(results[i].ident);
      }
    });

    test('/ - exported query - 200 success', async () => {
      const res = await request
        .get(BASE_URI)
        .query({exported: false})
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      expect(res.body).toEqual(checkGermlineReportList);
      expect(res.body.reports).toEqual(expect.arrayContaining([
        expect.objectContaining({exported: false}),
      ]));
    });

    test('/ - reviewType string query - 200 success', async () => {
      const res = await request
        .get(BASE_URI)
        .query({reviewType: 'biofx'})
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      expect(res.body).toEqual(checkGermlineReportList);
      expect(res.body.reports).toEqual(expect.arrayContaining([
        expect.objectContaining({
          reviews: expect.arrayContaining([
            expect.objectContaining({type: expect.stringContaining('biofx')}),
          ]),
        }),
      ]));
    });

    test('/ - reviewType array query - 200 success', async () => {
      const res = await request
        .get(BASE_URI)
        .query({reviewType: 'biofx,projects'})
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      expect(res.body).toEqual(checkGermlineReportList);
      expect(res.body.reports).toEqual(expect.arrayContaining([
        expect.objectContaining({
          reviews: expect.arrayContaining([
            expect.objectContaining({type: expect.stringMatching(/(biofx|projects)/)}),
          ]),
        }),
      ]));
    });

    test('/ - 200 NOT GET non-production reports with non-authorized group', async () => {
      const res = await request
        .get(BASE_URI)
        .query({
          groups: [{name: NON_AUTHORIZED_GROUP}],
          projects: [{name: realProject.name, ident: realProject.ident}],
        })
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      checkGermlineReports(res.body.reports);
      expect(hasNonProdReport(res.body.reports)).not.toBeTruthy();
    });

    test('/ - 200 GET non-production reports with authorized group', async () => {
      // CacheKey variable added in order to not trigger the cache.
      // Cache is being triggered by mocking the permissions,
      // Making it hard for the api to differenciate queries
      const res = await request
        .get(BASE_URI)
        .query({
          groups: [{name: AUTHORIZED_GROUP}],
          projects: [
            {name: realProject.name, ident: realProject.ident},
          ],
          cacheKey: '00',
        })
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      checkGermlineReports(res.body.reports);
      expect(hasNonProdReport(res.body.reports)).toBeTruthy();
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

    test('/{gsm_report} - error on non-production ident with wrong group', async () => {
      await request
        .get(`${BASE_URI}/${nonProdReport.ident}`)
        .query({
          groups: [{name: NON_AUTHORIZED_GROUP}],
          projects: [{name: realProject.name, ident: realProject.ident}],
        })
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.FORBIDDEN);
    });

    test('/{gsm_report} - allow query with correct group', async () => {
      const res = await request
        .get(`${BASE_URI}/${nonProdReport.ident}`)
        .query({
          groups: [{name: AUTHORIZED_GROUP}],
          projects: [{name: realProject.name, ident: realProject.ident}],
        })
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      checkGermlineReport(res.body);
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

      reports.push(result);
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

  // delete reports and projects
  afterAll(async () => {
    // delete newly created reports and all of their components
    await db.models.germlineSmallMutation.destroy({
      where: {
        ident: reports.map((rep) => {return rep.ident;}),
      },
      force: true,
    });

    // Delete projects
    await db.models.project.destroy({
      where: {
        id: projects.map((project) => {return project.id;}),
      },
      force: true,
    });
  });
});

afterAll(async () => {
  global.gc && global.gc();
  await server.close();
});
