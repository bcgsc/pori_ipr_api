const getPort = require('get-port');
const supertest = require('supertest');
const {v4: uuidv4} = require('uuid');
const HTTP_STATUS = require('http-status-codes');

const db = require('../../../app/models');
// get test user info
const CONFIG = require('../../../app/config');
const {listen} = require('../../../app');

CONFIG.set('env', 'test');
const {username, password} = CONFIG.get('testing');

const reportProperties = [
  'ident', 'createdAt', 'updatedAt', 'patientId', 'alternateIdentifier',
];

const checkReport = (reportObject) => {
  reportProperties.forEach((element) => {
    expect(reportObject).toHaveProperty(element);
  });
  expect(reportObject).toEqual(expect.not.objectContaining({
    id: expect.any(Number),
    updatedBy: expect.any(Number),
    deletedAt: expect.any(String),
  }));
};

const checkProjectReports = (reports) => {
  reports.forEach((report) => {
    checkReport(report);
  });
};

let server;
let request;

// Start API
beforeAll(async () => {
  const port = await getPort({port: CONFIG.get('web:port')});
  server = await listen(port);
  request = supertest(server);
});

// Tests for project report endpoints
describe('/project/:project/reports', () => {
  let project;
  let report;
  let report01;
  let report02;

  beforeAll(async () => {
    // Get genomic template
    const template = await db.models.template.findOne({where: {name: 'genomic'}});

    // Create project
    project = await db.models.project.create({name: 'report-project-test01'});

    // Create reports
    report = await db.models.report.create({
      templateId: template.id,
      patientId: 'REPORT-PROJECT-TEST',
      alternateIdentifier: 'reportProjectTest',
    });

    report01 = await db.models.report.create({
      templateId: template.id,
      patientId: 'REPORT-PROJECT-TEST01',
      alternateIdentifier: 'reportProjectTest01',
    });

    report02 = await db.models.report.create({
      templateId: template.id,
      patientId: 'REPORT-PROJECT-TEST02',
      alternateIdentifier: 'reportProjectTest02',
    });

    // Bind reports to project
    return Promise.all([
      db.models.reportProject.create({project_id: project.id, reportId: report01.id}),
      db.models.reportProject.create({project_id: project.id, reportId: report02.id}),
    ]);
  });

  afterAll(async () => {
    return Promise.all([
      project.destroy({force: true}),
      report01.destroy({force: true}),
      report02.destroy({force: true}),
    ]);
  });

  describe('GET', () => {
    test('/ - 200 Success', async () => {
      const res = await request
        .get(`/api/project/${project.ident}/reports`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2);
      checkProjectReports(res.body);
    });
  });

  describe('POST', () => {
    test('/ - 200 Success', async () => {
      await request
        .post(`/api/project/${project.ident}/reports`)
        .auth(username, password)
        .type('json')
        .send({report: report.ident})
        .expect(HTTP_STATUS.CREATED);

      // Check the binding was created
      const result = await db.models.reportProject.findOne({
        where: {project_id: project.id, reportId: report.id},
      });

      expect(result).not.toBeNull();

      // Remove the just created test report-project binding
      await db.models.reportProject.destroy({
        where: {project_id: project.id, reportId: report.id},
        force: true,
      });
    });

    test('/ - 404 Not Found - Cannot find provided report', async () => {
      await request
        .post(`/api/project/${project.ident}/reports`)
        .auth(username, password)
        .type('json')
        .send({report: uuidv4()})
        .expect(HTTP_STATUS.NOT_FOUND);
    });

    test('/ - 409 Conflict - Report is already bound to project', async () => {
      // Create binding
      const binding = await db.models.reportProject.create({
        project_id: project.id, reportId: report.id,
      });

      await request
        .post(`/api/project/${project.ident}/reports`)
        .auth(username, password)
        .type('json')
        .send({report: report.ident})
        .expect(HTTP_STATUS.CONFLICT);

      // Remove the just created test report-project binding
      await db.models.reportProject.destroy({where: {id: binding.id}, force: true});
    });
  });

  describe('DELETE', () => {
    test('/ - 204 Success', async () => {
      // Create binding
      const binding = await db.models.reportProject.create({
        project_id: project.id, reportId: report.id,
      });

      await request
        .delete(`/api/project/${project.ident}/reports`)
        .auth(username, password)
        .type('json')
        .send({report: report.ident})
        .expect(HTTP_STATUS.NO_CONTENT);

      // Verify report-project binding is soft-deleted
      const deletedBinding = await db.models.reportProject.findOne({
        where: {id: binding.id},
        paranoid: false,
      });

      expect(deletedBinding.deletedAt).not.toBeNull();

      await deletedBinding.destroy({force: true});
    });

    test('/ - 404 Not Found - Cannot find provided report', async () => {
      await request
        .delete(`/api/project/${project.ident}/reports`)
        .auth(username, password)
        .type('json')
        .send({report: uuidv4()})
        .expect(HTTP_STATUS.NOT_FOUND);
    });

    test('/ - 400 Bad Request - Report is not bound to project', async () => {
      await request
        .delete(`/api/project/${project.ident}/reports`)
        .auth(username, password)
        .type('json')
        .send({report: report.ident})
        .expect(HTTP_STATUS.BAD_REQUEST);
    });
  });
});

afterAll(async () => {
  global.gc && global.gc();
  await server.close();
});
