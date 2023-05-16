const getPort = require('get-port');
const supertest = require('supertest');
const HTTP_STATUS = require('http-status-codes');

const db = require('../../../app/models');
// get test user info
const CONFIG = require('../../../app/config');
const {listen} = require('../../../app');

CONFIG.set('env', 'test');
const {username, password} = CONFIG.get('testing');

const LONGER_TIMEOUT = 50000;

const projectProperties = [
  'ident', 'createdAt', 'updatedAt', 'name', 'users',
];

const checkProject = (projectObject) => {
  projectProperties.forEach((element) => {
    expect(projectObject).toHaveProperty(element);
  });
  expect(projectObject).toEqual(expect.not.objectContaining({
    id: expect.any(Number),
    updatedBy: expect.any(Number),
    deletedAt: expect.any(String),
  }));
};

const checkProjects = (projects) => {
  projects.forEach((project) => {
    checkProject(project);
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

// Tests for user related endpoints
describe('/project', () => {
  let project;
  let report01;
  let report02;

  beforeAll(async () => {
    // Create project
    project = await db.models.project.create({name: 'test-project'});

    // Get genomic template
    const template = await db.models.template.findOne({where: {name: 'genomic'}});

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
    return project.destroy({force: true});
  });

  describe('GET', () => {
    test('/ - 200 Success', async () => {
      const res = await request
        .get('/api/project')
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.some((e) => {return e.reportCount === '2';})).toBe(true);
      checkProjects(res.body);
    }, LONGER_TIMEOUT);

    test('/{project} - 200 Success', async () => {
      const res = await request
        .get(`/api/project/${project.ident}`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      checkProject(res.body);
    });
  });

  describe('POST', () => {
    test('/ - 200 Success', async () => {
      const res = await request
        .post('/api/project')
        .auth(username, password)
        .type('json')
        .send({name: 'new-project-test-project01'})
        .expect(HTTP_STATUS.CREATED);

      // Remove test project from db
      await db.models.project.destroy({where: {ident: res.body.ident}, force: true});
    });

    test('/ - 409 Conflict - Project name is taken', async () => {
      await request
        .post('/api/project')
        .auth(username, password)
        .type('json')
        .send({name: 'test-project'})
        .expect(HTTP_STATUS.CONFLICT);
    });

    test('/ - 400 Bad Request - Invalid request because of an additional property', async () => {
      await request
        .post('/api/project')
        .auth(username, password)
        .type('json')
        .send({
          name: 'New-project-name01',
          type: 'INVALID-PROPERTY',
        })
        .expect(HTTP_STATUS.BAD_REQUEST);
    });
  });

  describe('PUT', () => {
    let putTestProject;

    beforeEach(async () => {
      putTestProject = await db.models.project.create({
        name: 'put-test-project01',
        description: 'put-test-description01',
      });
    });

    afterEach(async () => {
      return putTestProject.destroy({force: true});
    });

    test('/{project} - 200 Success', async () => {
      const res = await request
        .put(`/api/project/${putTestProject.ident}`)
        .send(
          {
            name: 'put-test-updated-project01',
            description: 'put-test-updated-description01',
          },
        )
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      checkProject(res.body);
      expect(res.body.name).toBe('put-test-updated-project01');
      expect(res.body.description).toBe('put-test-updated-description01');
    });

    test('/{project} - 400 Bad Request - Name too short', async () => {
      await request
        .put(`/api/project/${putTestProject.ident}`)
        .send({name: 'b'})
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.BAD_REQUEST);
    });

    test('/{project} - 400 Bad Request - Additional Property', async () => {
      await request
        .put(`/api/project/${putTestProject.ident}`)
        .send({
          name: 'updated-test-name02',
          prop: 'ADDITIONAL_PROPERTY',
        })
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.BAD_REQUEST);
    });
  });

  describe('DELETE', () => {
    let deleteTestProject;

    beforeEach(async () => {
      deleteTestProject = await db.models.project.create({
        name: 'delete-test-project01',
      });
    });

    afterEach(async () => {
      return deleteTestProject.destroy({force: true});
    });

    test('/{project} - 204 Success', async () => {
      await request
        .delete(`/api/project/${deleteTestProject.ident}`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.NO_CONTENT);

      // Verify project is soft-deleted
      const deletedUser = await db.models.project.findOne({
        where: {ident: deleteTestProject.ident}, paranoid: false,
      });
      expect(deletedUser.deletedAt).not.toBeNull();
    });
  });
});

afterAll(async () => {
  await server.close();
});
