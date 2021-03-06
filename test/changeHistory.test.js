process.env.NODE_ENV = 'test';

const HTTP_STATUS = require('http-status-codes');

const supertest = require('supertest');
const uuidv4 = require('uuid/v4');
const getPort = require('get-port');

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
  let ident;

  beforeAll(async () => {
    // create project record
    let res = await request
      .post('/api/project')
      .auth(username, password)
      .type('json')
      .send(projectData)
      .expect(HTTP_STATUS.CREATED);
    ident = res.body.ident;


    // check that the created project record exists
    res = await request
      .get(`/api/project/search?query=${projectData.name}`)
      .auth(username, password)
      .type('json')
      .expect(200);

    res.body = res.body[0];

    expect(res.body).toHaveProperty('ident');
    expect(res.body).toHaveProperty('name');
    expect(res.body).toHaveProperty('createdAt');
    expect(res.body).toHaveProperty('updatedAt');

    expect(res.body.ident).toEqual(ident);
  });

  // Test update changes
  test('Test update changes', async () => {
    // update project name for given ident
    await request
      .put(`/api/project/${ident}`)
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

  // Remove newly created/updated project
  afterAll(async () => {
    // delete newly created project
    await request
      .delete(`/api/project/${ident}`)
      .auth(username, password)
      .type('json')
      .expect(HTTP_STATUS.NO_CONTENT);

    // verify project is deleted
    await request
      .get(`/api/project/search?query=${projectData.name}`)
      .auth(username, password)
      .type('json')
      .expect(HTTP_STATUS.NOT_FOUND);
  });
});

afterAll(async () => {
  await server.close();
});
