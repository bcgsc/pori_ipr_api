const HTTP_STATUS = require('http-status-codes');
const supertest = require('supertest');
const {v4: uuidv4} = require('uuid');
const getPort = require('get-port');
const db = require('../app/models');

// get test user info
const CONFIG = require('../app/config');
const {listen} = require('../app');

CONFIG.set('env', 'test');

const {username, password} = CONFIG.get('testing');

// new project info
const projectData = {
  name: `TEST-PROJECT-${uuidv4()}`,
};

// data for update project
const update = {
  // Can't have duplicate project name so I'm appending a UUID
  name: `UPDATED-TEST-PROJECT-${uuidv4()}`,
};

let server;
let request;

// Start API
beforeAll(async () => {
  const port = await getPort({port: CONFIG.get('web:port')});
  server = await listen(port);
  request = supertest(server);
});

// Tests history changes and update changes
describe('Tests for update changes', () => {
  let project;

  beforeAll(async () => {
    // Create project record
    project = await db.models.project.create(projectData);
  });

  // Test update changes
  test('update changes', async () => {
    // update project name for given ident
    await request
      .put(`/api/project/${project.ident}`)
      .auth(username, password)
      .type('json')
      .send({...update})
      .expect(HTTP_STATUS.OK);

    // get updated project and compare to update values
    const res = await request
      .get(`/api/project/search?query=${update.name}`)
      .auth(username, password)
      .type('json')
      .expect(HTTP_STATUS.OK);

    expect(Array.isArray(res.body)).toBe(true);
    res.body = res.body[0];

    // Should equal updated values
    expect(res.body.name).toEqual(update.name);
  });

  afterAll(async () => {
    // Delete newly created project
    return project.destroy({force: true});
  });
});

afterAll(async () => {
  global.gc && global.gc();
  await server.close();
});
