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
    'kbUrl', 'pediatricIds', 'captiv8Score', 'appendix', 'hrdetectScore',
    'legacyReportFilepath', 'legacyPresentationFilepath',
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

const checkState = (reports, stateCheck) => {
  return reports.some((report) => {
    return report.state === stateCheck;
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
  const NON_PROD_ACCESS = 'Non-Production Access';
  const UNREVIEWED_ACCESS = 'Unreviewed Access';

  let project;
  let project2;
  let offsetTestProject;
  let report;
  let reportReady;
  let reportReviewed;
  let reportCompleted;
  let reportNonProduction;
  let report2;
  let reportReady2;
  let reportReviewed2;
  let reportCompleted2;
  let reportNonProduction2;
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
    offsetTestProject = await db.models.project.create({name: `offset${randomUuid.toString()}`});

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

    reportCompleted = await db.models.report.create({
      templateId: template.id,
      patientId: mockReportData.patientId,
      state: 'completed',
    });
    await db.models.reportProject.create({
      reportId: reportCompleted.id,
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

    // create a second set of reports for use in the offset test, which relies on
    // a predictable set of reports in the db which means using a specific project
    // and creating reports just for it. otherwise other tests running at the same
    // time can interfere
    report2 = await db.models.report.create({
      templateId: template.id,
      patientId: mockReportData.patientId,
      tumourContent: 100,
      m1m2Score: 22.5,
    });
    await db.models.reportProject.create({
      reportId: report2.id,
      project_id: offsetTestProject.id,
    });

    reportReady2 = await db.models.report.create({
      templateId: template.id,
      patientId: mockReportData.patientId,
      state: 'ready',
    });
    await db.models.reportProject.create({
      reportId: reportReady2.id,
      project_id: offsetTestProject.id,
    });

    reportNonProduction2 = await db.models.report.create({
      templateId: template.id,
      patientId: mockReportData.patientId,
      state: 'nonproduction',
    });
    await db.models.reportProject.create({
      reportId: reportNonProduction2.id,
      project_id: offsetTestProject.id,
    });

    reportReviewed2 = await db.models.report.create({
      templateId: template.id,
      patientId: mockReportData.patientId,
      state: 'reviewed',
    });
    await db.models.reportProject.create({
      reportId: reportReviewed2.id,
      project_id: offsetTestProject.id,
    });

    reportCompleted2 = await db.models.report.create({
      templateId: template.id,
      patientId: mockReportData.patientId,
      state: 'completed',
    });
    await db.models.reportProject.create({
      reportId: reportCompleted2.id,
      project_id: offsetTestProject.id,
    });
  }, LONGER_TIMEOUT);

  describe('GET', () => {
    // Test regular GET
    test.skip('/ - 200 Success', async () => {
      const res = await request
        .get('/api/reports')
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      checkReports(res.body.reports);
    }, LONGER_TIMEOUT);

    // Test GET with paginated
    test.skip('/ - paginated - 400 Bad Request', async () => {
      await request
        .get('/api/reports?paginated=NOT_BOOLEAN')
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.BAD_REQUEST);
    });

    test.skip('/ - 200 GET non-production reports with "non-production access" group', async () => {
      const res = await request
        .get('/api/reports')
        .query({
          groups: [{name: NON_PROD_ACCESS}, {name: UNREVIEWED_ACCESS}],
          projects: [{name: project.name}],
        })
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      checkReports(res.body.reports);
      expect(checkState(res.body.reports, 'nonproduction')).toBeTruthy();
    }, LONGER_TIMEOUT);

    test.skip('/ - 200 NOT GET non-production reports with non-authorized group', async () => {
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
      expect(checkState(res.body.reports, 'nonproduction')).not.toBeTruthy();
    }, LONGER_TIMEOUT);

    test.skip('/ - 200 GET report if have additional report permission', async () => {
      const res = await request
        .get('/api/reports')
        .query({
          groups: [{name: NON_PROD_ACCESS}, {name: UNREVIEWED_ACCESS}],
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

    test.skip('/ - 200 GET unreviewed reports with "unreviewed access" group', async () => {
      const res = await request
        .get('/api/reports')
        .query({
          groups: [{name: UNREVIEWED_ACCESS}],
          projects: [{name: project.name}],
        })
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      checkReports(res.body.reports);
      expect(checkState(res.body.reports, 'ready')).toBeTruthy();
    }, LONGER_TIMEOUT);

    test.skip('/ - 200 NOT GET unreviewed reports with non-authorized group', async () => {
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
      expect(checkState(res.body.reports, 'ready')).not.toBeTruthy();
    }, LONGER_TIMEOUT);

    // Test GET with limit
    test.skip('/ - limit - 200 Success', async () => {
      const res = await request
        .get('/api/reports?paginated=true&limit=4')
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      checkReports(res.body.reports);
      expect(res.body.reports.length).toBeLessThanOrEqual(4);
    }, LONGER_TIMEOUT);

    test.skip('/ - limit - 400 Bad Request', async () => {
      await request
        .get('/api/reports?paginated=true&limit=NOT_INTEGER')
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.BAD_REQUEST);
    });

    test.skip('/ - offset - 200 Success', async () => {
      const totalOffsetReports = 5;
      const res = await request
        .get(`/api/reports?project=${offsetTestProject.name}&paginated=true&offset=${totalOffsetReports - 3}`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      checkReports(res.body.reports);
      expect(res.body.reports.length).toBe(3);
    }, LONGER_TIMEOUT);

    test.skip('/ - offset - 400 Bad Request', async () => {
      await request
        .get('/api/reports?paginated=true&offset=NOT_INTEGER')
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.BAD_REQUEST);
    });

    // Test GET with sort
    test.skip('/ - sort - 200 Success', async () => {
      const res = await request
        .get('/api/reports?sort=patientId:desc')
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      checkReports(res.body.reports);
      expect(res.body.reports[0].patientId).toEqual(res.body.reports[1].patientId);
    }, LONGER_TIMEOUT);

    test.skip('/ - sort - 400 Bad Request', async () => {
      await request
        .get('/api/reports?sort=INVALID_FIELD:desc')
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.BAD_REQUEST);
    });

    // Test GET with project
    test.skip('/ - project - 200 Success', async () => {
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

    test.skip('/ - project - 403 Forbidden', async () => {
      await request
        .get('/api/reports?project=SUPER-SECURE')
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.FORBIDDEN);
    });

    // Test GET with states
    test.skip('/ - states - 200 Success', async () => {
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

    test.skip('/ - states - 400 Bad Request', async () => {
      await request
        .get('/api/reports?states=INVALID_STATE')
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.BAD_REQUEST);
    });

    // Test GET with role
    test.skip('/ - role - 200 Success', async () => {
      const res = await request
        .get('/api/reports?role=clinician')
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      checkReports(res.body.reports);

      expect(res.body.reports).toEqual([]);
    }, LONGER_TIMEOUT);

    test.skip('/ - role - 400 Bad Request', async () => {
      await request
        .get('/api/reports?role=INVALID_ROLE')
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.BAD_REQUEST);
    });

    // Test GET with search text
    test.skip('/ - search text - 200 Success', async () => {
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

    test.skip('fetches known ident ok', async () => {
      const res = await request
        .get(`/api/reports/${report.ident}`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      checkReport(res.body);
    });

    test.skip('fetches additional project permission ok', async () => {
      const res = await request
        .get(`/api/reports/${reportDualProj.ident}`)
        .query({
          groups: [{name: NON_PROD_ACCESS}, {name: UNREVIEWED_ACCESS}],
          projects: [{name: project2.name, ident: project2.ident}],
        })
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      checkReport(res.body);
    });

    test.skip('fetches non-production ident with group OK', async () => {
      const res = await request
        .get(`/api/reports/${reportNonProduction.ident}`)
        .query({
          groups: [{name: NON_PROD_ACCESS}, {name: UNREVIEWED_ACCESS}],
          projects: [{name: project.name, ident: project.ident}],
        })
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      checkReport(res.body);
    });

    test.skip('error on non-production ident with wrong group', async () => {
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

    test.skip('fetches unreviewed ident with group OK', async () => {
      const res = await request
        .get(`/api/reports/${reportReady.ident}`)
        .query({
          groups: [{name: UNREVIEWED_ACCESS}],
          projects: [{name: project.name, ident: project.ident}],
        })
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      checkReport(res.body);
    });

    test.skip('error on unreviewed ident with wrong group', async () => {
      await request
        .get(`/api/reports/${reportReady.ident}`)
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

      // when multiple report-generating test modules are running simultaneously
      // the full content of res.body can't be guaranteed; restrict checks to
      // tests created for this module
      const expectedReports = [report, reportReady, reportReviewed, reportCompleted, reportNonProduction, report2, reportReady2, reportReviewed2, reportCompleted2, reportNonProduction2, reportDualProj];
      expect(res.body.total).toBeGreaterThanOrEqual(expectedReports.length);
      const expectedIds = (expectedReports).map((elem) => {return elem.ident;});
      const foundIds = (res.body.reports).map((elem) => {return elem.ident;});
      const allPresent = expectedIds.every((elem) => {return foundIds.includes(elem);});
      expect(allPresent).toBeTruthy();
    });

    test.skip('State querying is OK', async () => {
      // TODO: Add checks when https://www.bcgsc.ca/jira/browse/DEVSU-1273 is done
      const res = await request
        .get('/api/reports')
        .query({states: 'reviewed,completed'})
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      res.body.reports.forEach((reportObject) => {
        expect(reportObject.state === 'reviewed' || reportObject.state === 'completed').toBeTruthy();
      });
    });

    test.skip('Multiple queries is OK', async () => {
      // TODO: Add checks when https://www.bcgsc.ca/jira/browse/DEVSU-1273 is done
      const res = await request
        .get('/api/reports')
        .query({
          states: 'reviewed,completed',
          role: 'bioinformatician',
        })
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      res.body.reports.forEach((reportObject) => {
        expect(reportObject.state === 'reviewed' || reportObject.state === 'completed').toBeTruthy();
        expect(reportObject.users.some((user) => {
          return user.role === 'bioinformatician';
        })).toBeTruthy();
      });
    });

    test.skip('error on non-existant ident', async () => {
      await request
        .get(`/api/reports/${randomUuid}`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.NOT_FOUND);
    });
  });

  describe('PUT', () => {
    test.skip('state updated to ready when reviewed OK', async () => {
      const res = await request
        .put(`/api/reports/${reportReviewed.ident}`)
        .auth(username, password)
        .type('json')
        .send({
          tumourContent: 42.2,
        })
        .expect(HTTP_STATUS.OK);

      checkReport(res.body);
      expect(res.body).toHaveProperty('state', 'ready');
    });

    test.skip('state NOT updated to ready when NOT reviewed OK', async () => {
      const res = await request
        .put(`/api/reports/${reportCompleted.ident}`)
        .auth(username, password)
        .type('json')
        .send({
          tumourContent: 42.2,
        })
        .expect(HTTP_STATUS.OK);

      checkReport(res.body);
      expect(res.body).toHaveProperty('state', 'completed');
    });

    test.skip('tumour content update OK', async () => {
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

    test.skip('completed report update OK', async () => {
      const res = await request
        .put(`/api/reports/${reportCompleted.ident}`)
        .auth(username, password)
        .type('json')
        .send({
          tumourContent: 23.2,
        })
        .expect(HTTP_STATUS.OK);

      checkReport(res.body);
      expect(res.body).toHaveProperty('tumourContent', 23.2);
    });

    test.skip('completed report update FORBIDDEN', async () => {
      await request
        .put(`/api/reports/${reportCompleted.ident}`)
        .query({
          groups: [{name: NON_PROD_ACCESS}, {name: UNREVIEWED_ACCESS}],
          projects: [{name: project.name}],
        })
        .auth(username, password)
        .type('json')
        .send({
          tumourContent: 25.5,
        })
        .expect(HTTP_STATUS.FORBIDDEN);
    });

    test.skip('M1M2 Score update OK', async () => {
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

    test.skip('ploidy update OK', async () => {
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

    test.skip('subtyping update OK', async () => {
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

    test.skip('error on unexpected value', async () => {
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
    await db.models.report.destroy({where: {id: reportCompleted.id}, force: true});
    await db.models.report.destroy({where: {id: reportNonProduction.id}, force: true});
    await db.models.report.destroy({where: {id: report2.id}, force: true});
    await db.models.report.destroy({where: {id: reportReady2.id}, force: true});
    await db.models.report.destroy({where: {id: reportReviewed2.id}, force: true});
    await db.models.report.destroy({where: {id: reportCompleted2.id}, force: true});
    await db.models.report.destroy({where: {id: reportNonProduction2.id}, force: true});
    await db.models.report.destroy({where: {id: reportDualProj.id}, force: true});
    await db.models.project.destroy({where: {id: offsetTestProject.id}, force: true});
  }, LONGER_TIMEOUT);
});

afterAll(async () => {
  global.gc && global.gc();
  await server.close();
});
