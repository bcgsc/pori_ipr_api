process.env.NODE_ENV = 'test';

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
      .post('/api/1.0/project')
      .auth(username, password)
      .type('json')
      .send(projectData)
      .expect(201);
    ident = res.body.ident;


    // check that the created project record exists
    res = await request
      .get(`/api/1.0/project/search?query=${projectData.name}`)
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
      .put(`/api/1.0/project/${ident}`)
      .auth(username, password)
      .type('json')
      .send({...update})
      .expect(200);

    // get updated project and compare to update values
    const res = await request
      .get(`/api/1.0/project/search?query=${update.name}`)
      .auth(username, password)
      .type('json')
      .expect(200);

    expect(Array.isArray(res.body));
    res.body = res.body[0];

    // Should equal updated values
    expect(res.body.name).toEqual(update.name);
  });

  // Remove newly created/updated project
  afterAll(async () => {
    // delete newly created project
    await request
      .delete(`/api/1.0/project/${ident}`)
      .auth(username, password)
      .type('json')
      .expect(204);

    // verify project is deleted
    await request
      .get(`/api/1.0/POG/project/search?query=${projectData.name}`)
      .auth(username, password)
      .type('json')
      .expect(404);
  });
});

afterAll(async () => {
  await server.close();
});
