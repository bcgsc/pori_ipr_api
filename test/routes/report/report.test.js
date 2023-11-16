const HTTP_STATUS = require('http-status-codes');

const {v4: uuidv4} = require('uuid');
const supertest = require('supertest');
const getPort = require('get-port');
const db = require('../../../app/models');

const mockReportData = require('../../testData/mockReportData.json');

const CONFIG = require('../../../app/config');
const {listen} = require('../../../app');

CONFIG.set('env', 'test');

const {username, password} = CONFIG.get('testing');

jest.mock('../../../app/middleware/auth.js');

const LONGER_TIMEOUT = 50000;

let server;
let request;

const checkReport = (report) => {
  [
    'tumourContent', 'ploidy', 'subtyping', 'ident', 'patientId',
    'sampleInfo', 'seqQC', 'reportVersion', 'm1m2Score',
    'state', 'expression_matrix', 'alternateIdentifier', 'ageOfConsent',
    'biopsyDate', 'biopsyName', 'presentationDate', 'kbDiseaseMatch',
    'kbUrl', 'pediatricIds', 'captiv8Score',
  ].forEach((element) => {
    expect(report).toHaveProperty(element);
  });
  expect(report).toEqual(expect.not.objectContaining({
    id: expect.any(Number),
    reportId: expect.any(Number),
    deletedAt: expect.any(String),
    config: expect.any(String),
  }));
};

const checkReports = (reports) => {
  reports.forEach((report) => {
    checkReport(report);
  });
};

const hasNonProdReport = (reports) => {
  return reports.some((report) => {
    return report.state === 'nonproduction';
  });
};

// Start API
beforeAll(async () => {
  const port = await getPort({port: CONFIG.get('web:port')});
  server = await listen(port);
  request = supertest(server);
});

describe('/reports/{REPORTID}', () => {
  const randomUuid = uuidv4();

  const NON_AUTHORIZED_GROUP = 'NON AUTHORIZED GROUP';
  const AUTHORIZED_GROUP = 'Non-Production Access';

  let project;
  let project2;
  let report;
  let reportReady;
  let reportReviewed;
  let reportArchived;
  let reportNonProduction;
  let totalReports;
  let reportDualProj;

  beforeAll(async () => {
    // Get genomic template
    const template = await db.models.template.findOne({where: {name: 'genomic'}});
    // Create Report and associate projects
    project = await db.models.project.findOne({
      where: {
        name: 'TEST',
      },
    });
    [project2] = await db.models.project.findOrCreate({
      where: {
        name: 'TEST2',
      },
    });

    report = await db.models.report.create({
      templateId: template.id,
      patientId: mockReportData.patientId,
      tumourContent: 100,
      m1m2Score: 22.5,
    });
    await db.models.reportProject.create({
      reportId: report.id,
      project_id: project.id,
    });

    reportReady = await db.models.report.create({
      templateId: template.id,
      patientId: mockReportData.patientId,
      state: 'ready',
    });
    await db.models.reportProject.create({
      reportId: reportReady.id,
      project_id: project.id,
    });

    reportNonProduction = await db.models.report.create({
      templateId: template.id,
      patientId: mockReportData.patientId,
      state: 'nonproduction',
    });
    await db.models.reportProject.create({
      reportId: reportNonProduction.id,
      project_id: project.id,
    });

    reportReviewed = await db.models.report.create({
      templateId: template.id,
      patientId: mockReportData.patientId,
      state: 'reviewed',
    });
    await db.models.reportProject.create({
      reportId: reportReviewed.id,
      project_id: project.id,
    });

    reportArchived = await db.models.report.create({
      templateId: template.id,
      patientId: mockReportData.patientId,
      state: 'archived',
    });
    await db.models.reportProject.create({
      reportId: reportArchived.id,
      project_id: project.id,
    });

    reportDualProj = await db.models.report.create({
      templateId: template.id,
      patientId: mockReportData.patientId,
    });
    await db.models.reportProject.create({
      reportId: reportDualProj.id,
      project_id: project.id,
      additionalProject: false,
    });
    await db.models.reportProject.create({
      reportId: reportDualProj.id,
      project_id: project2.id,
      additionalProject: true,
    });

    totalReports = await db.models.report.count();
  }, LONGER_TIMEOUT);

  describe('GET', () => {
    // Test regular GET
    test('/ - 200 Success', async () => {
      const res = await request
        .get('/api/reports')
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      checkReports(res.body.reports);
    }, LONGER_TIMEOUT);

    // Test GET with paginated
    test('/ - paginated - 400 Bad Request', async () => {
      await request
        .get('/api/reports?paginated=NOT_BOOLEAN')
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.BAD_REQUEST);
    });

    test('/ - 200 GET non-production reports with "non-production access" group', async () => {
      const res = await request
        .get('/api/reports')
        .query({
          groups: [{name: AUTHORIZED_GROUP}],
          projects: [{name: project.name}],
        })
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      checkReports(res.body.reports);
      expect(hasNonProdReport(res.body.reports)).toBeTruthy();
    }, LONGER_TIMEOUT);

    test('/ - 200 NOT GET non-production reports with non-authorized group', async () => {
      const res = await request
        .get('/api/reports')
        .query({
          groups: [{name: NON_AUTHORIZED_GROUP}],
          projects: [{name: project.name}],
        })
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      checkReports(res.body.reports);
      expect(hasNonProdReport(res.body.reports)).not.toBeTruthy();
    }, LONGER_TIMEOUT);

    test('/ - 200 GET report if have additional report permission', async () => {
      const res = await request
        .get('/api/reports')
        .query({
          groups: [{name: AUTHORIZED_GROUP}],
          projects: [{name: project2.name}],
        })
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      checkReports(res.body.reports);
      expect(res.body.reports.filter(
        (e) => {
          return e.ident === reportDualProj.ident;
        },
      ).length > 0).toBeTruthy();
    }, LONGER_TIMEOUT);

    // Test GET with limit
    test('/ - limit - 200 Success', async () => {
      const res = await request
        .get('/api/reports?paginated=true&limit=4')
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      checkReports(res.body.reports);
      expect(res.body.reports.length).toBeLessThanOrEqual(4);
    }, LONGER_TIMEOUT);

    test('/ - limit - 400 Bad Request', async () => {
      await request
        .get('/api/reports?paginated=true&limit=NOT_INTEGER')
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.BAD_REQUEST);
    });

    // Test GET with offset
    test('/ - offset - 200 Success', async () => {
      const res = await request
        .get(`/api/reports?paginated=true&offset=${totalReports - 3}`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      checkReports(res.body.reports);
      expect(res.body.reports.length).toBe(3);
    }, LONGER_TIMEOUT);

    test('/ - offset - 400 Bad Request', async () => {
      await request
        .get('/api/reports?paginated=true&offset=NOT_INTEGER')
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.BAD_REQUEST);
    });

    // Test GET with sort
    test('/ - sort - 200 Success', async () => {
      const res = await request
        .get('/api/reports?sort=patientId:desc')
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      checkReports(res.body.reports);
      expect(res.body.reports[0].patientId).toEqual(res.body.reports[1].patientId);
    }, LONGER_TIMEOUT);

    test('/ - sort - 400 Bad Request', async () => {
      await request
        .get('/api/reports?sort=INVALID_FIELD:desc')
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.BAD_REQUEST);
    });

    // Test GET with project
    test('/ - project - 200 Success', async () => {
      const res = await request
        .get('/api/reports?project=TEST')
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      checkReports(res.body.reports);

      expect(res.body.reports).toEqual(expect.arrayContaining([
        expect.objectContaining({projects: expect.arrayContaining([
          expect.objectContaining({name: expect.stringContaining('TEST')}),
        ])}),
      ]));
    });

    test('/ - project - 403 Forbidden', async () => {
      await request
        .get('/api/reports?project=SUPER-SECURE')
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.FORBIDDEN);
    });

    // Test GET with states
    test('/ - states - 200 Success', async () => {
      const res = await request
        .get('/api/reports?states=ready')
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      checkReports(res.body.reports);

      expect(res.body.reports).toEqual(expect.arrayContaining([
        expect.objectContaining({state: expect.stringContaining('ready')}),
      ]));
    }, LONGER_TIMEOUT);

    test('/ - states - 400 Bad Request', async () => {
      await request
        .get('/api/reports?states=INVALID_STATE')
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.BAD_REQUEST);
    });

    // Test GET with role
    test('/ - role - 200 Success', async () => {
      const res = await request
        .get('/api/reports?role=clinician')
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      checkReports(res.body.reports);

      expect(res.body.reports).toEqual([]);
    }, LONGER_TIMEOUT);

    test('/ - role - 400 Bad Request', async () => {
      await request
        .get('/api/reports?role=INVALID_ROLE')
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.BAD_REQUEST);
    });

    // Test GET with search text
    test('/ - search text - 200 Success', async () => {
      const res = await request
        .get('/api/reports?searchText=UPLOADPAT01')
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      checkReports(res.body.reports);

      expect(res.body.reports).toEqual(expect.arrayContaining([
        expect.objectContaining({patientId: expect.stringContaining('UPLOADPAT01')}),
      ]));
    }, LONGER_TIMEOUT);

    test('fetches known ident ok', async () => {
      const res = await request
        .get(`/api/reports/${report.ident}`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      checkReport(res.body);
    });

    test('fetches additional project permission ok', async () => {
      const res = await request
        .get(`/api/reports/${reportDualProj.ident}`)
        .query({
          groups: [{name: AUTHORIZED_GROUP}],
          projects: [{name: project2.name, ident: project2.ident}],
        })
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      checkReport(res.body);
    });

    test('fetches non-production ident with group OK', async () => {
      const res = await request
        .get(`/api/reports/${reportNonProduction.ident}`)
        .query({
          groups: [{name: AUTHORIZED_GROUP}],
          projects: [{name: project.name, ident: project.ident}],
        })
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      checkReport(res.body);
    });

    test('error on non-production ident with wrong group', async () => {
      await request
        .get(`/api/reports/${reportNonProduction.ident}`)
        .query({
          groups: [{name: NON_AUTHORIZED_GROUP}],
          projects: [{name: project.name, ident: project.ident}],
        })
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.FORBIDDEN);
    });

    test('No queries is OK', async () => {
      // TODO: Add checks when https://www.bcgsc.ca/jira/browse/DEVSU-1273 is done
      const res = await request
        .get('/api/reports')
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      // Check if the number of reports returned by api is the same as db
      expect(res.body.total).toEqual(totalReports);
    });

    test('State querying is OK', async () => {
      // TODO: Add checks when https://www.bcgsc.ca/jira/browse/DEVSU-1273 is done
      const res = await request
        .get('/api/reports')
        .query({states: 'reviewed,archived'})
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      res.body.reports.forEach((reportObject) => {
        expect(reportObject.state === 'reviewed' || reportObject.state === 'archived').toBeTruthy();
      });
    });

    test('Multiple queries is OK', async () => {
      // TODO: Add checks when https://www.bcgsc.ca/jira/browse/DEVSU-1273 is done
      const res = await request
        .get('/api/reports')
        .query({
          states: 'reviewed,archived',
          role: 'bioinformatician',
        })
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      res.body.reports.forEach((reportObject) => {
        expect(reportObject.state === 'reviewed' || reportObject.state === 'archived').toBeTruthy();
        expect(reportObject.users.some((user) => {
          return user.role === 'bioinformatician';
        })).toBeTruthy();
      });
    });

    test('error on non-existant ident', async () => {
      await request
        .get(`/api/reports/${randomUuid}`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.NOT_FOUND);
    });
  });

  describe('PUT', () => {
    test('tumour content update OK', async () => {
      const res = await request
        .put(`/api/reports/${report.ident}`)
        .auth(username, password)
        .type('json')
        .send({
          tumourContent: 23.2,
        })
        .expect(HTTP_STATUS.OK);

      checkReport(res.body);
      expect(res.body).toHaveProperty('tumourContent', 23.2);
    });

    describe('PUT', () => {
      test('M1M2 Score update OK', async () => {
        const res = await request
          .put(`/api/reports/${report.ident}`)
          .auth(username, password)
          .type('json')
          .send({
            m1m2Score: 98.5,
          })
          .expect(HTTP_STATUS.OK);

        checkReport(res.body);
        expect(res.body).toHaveProperty('m1m2Score', 98.5);
      });
    });

    test('ploidy update OK', async () => {
      const res = await request
        .put(`/api/reports/${report.ident}`)
        .auth(username, password)
        .type('json')
        .send({
          ploidy: 'triploid',
        })
        .expect(HTTP_STATUS.OK);

      checkReport(res.body);
      expect(res.body).toHaveProperty('ploidy', 'triploid');
    });

    test('subtyping update OK', async () => {
      const res = await request
        .put(`/api/reports/${report.ident}`)
        .auth(username, password)
        .type('json')
        .send({
          subtyping: 'ER positive',
        })
        .expect(HTTP_STATUS.OK);

      checkReport(res.body);
      expect(res.body).toHaveProperty('subtyping', 'ER positive');
    });

    test('error on unexpected value', async () => {
      await request
        .put(`/api/reports/${report.ident}`)
        .auth(username, password)
        .type('json')
        .send({
          badValue: 'SYTHR',
        })
        .expect(HTTP_STATUS.BAD_REQUEST);
    });
  });

  // delete report
  afterAll(async () => {
    await db.models.report.destroy({where: {id: report.id}, force: true});
    await db.models.report.destroy({where: {id: reportReady.id}, force: true});
    await db.models.report.destroy({where: {id: reportReviewed.id}, force: true});
    await db.models.report.destroy({where: {id: reportArchived.id}, force: true});
    await db.models.report.destroy({where: {id: reportNonProduction.id}, force: true});
    await db.models.report.destroy({where: {id: reportNonProduction.id}, force: true});
  }, LONGER_TIMEOUT);
});

afterAll(async () => {
  global.gc && global.gc();
  await server.close();
});
