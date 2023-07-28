const getPort = require('get-port');
const supertest = require('supertest');
const HTTP_STATUS = require('http-status-codes');
const {Op} = require('sequelize');

const db = require('../../../app/models');
// get test user info
const CONFIG = require('../../../app/config');
const {listen} = require('../../../app');

CONFIG.set('env', 'test');
const {username, password} = CONFIG.get('testing');

const projectProperties = [
  'ident', 'createdAt', 'updatedAt', 'name',
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

// Tests for project search endpoint
describe('/project/search', () => {
  beforeAll(async () => {
    // Create projects
    await db.models.project.bulkCreate([
      {name: 'search-project-test01'},
      {name: 'search-project-test02'},
    ]);
  });

  afterAll(async () => {
    return db.models.project.destroy({
      where: {[Op.or]: [{name: 'search-project-test01'}, {name: 'search-project-test02'}]},
      force: true,
    });
  });

  describe('GET', () => {
    test('/ - 200 Success - Has project access', async () => {
      const res = await request
        .get('/api/project/search?query=search-project-test01')
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
      checkProjects(res.body);
      expect(res.body).toEqual(expect.arrayContaining([
        expect.objectContaining({name: expect.stringContaining('search-project-test01')}),
      ]));
    });
  });
});

afterAll(async () => {
  global.gc && global.gc();
  await server.close();
});
