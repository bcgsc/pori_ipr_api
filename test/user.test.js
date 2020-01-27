process.env.NODE_ENV = 'test';

const getPort = require('get-port');
const supertest = require('supertest');
const uuidv4 = require('uuid/v4');

// get test user info
const CONFIG = require('../app/config');
const {listen} = require('../app');

CONFIG.set('env', 'test');

const {username, password} = CONFIG.get('testing');

// New User account that will be used for tests
const newUser = {
  username: `Testuser-${uuidv4()}`,
  type: 'bcgsc',
  email: 'testuser@test.com',
  firstName: 'FirstNameTest',
  lastName: 'LastNameTest',
};

let newUserIdent;

let server;
let request;
// Start API
beforeAll(async () => {
  const port = await getPort({port: CONFIG.get('web:port')});
  server = await listen(port);
  request = supertest(server);
});

// Tests for user related endpoints
describe('/user', () => {
  // Test for GET /user 200 endpoint
  test('GET list of users', async () => {
    const res = await request
      .get('/api/1.0/user')
      .auth(username, password)
      .type('json')
      .expect(200);

    expect(Array.isArray(res.body));
    expect(res.body[0]).toHaveProperty('ident');
    expect(res.body[0]).toHaveProperty('username');
    expect(res.body[0]).toHaveProperty('type');
    expect(res.body[0]).toHaveProperty('email');
    expect(res.body[0]).toHaveProperty('firstName');
    expect(res.body[0]).toHaveProperty('lastName');
  });
  // Test for GET /user/me 200 endpoint
  test('GET current user /me', async () => {
    const res = await request
      .get('/api/1.0/user/me')
      .auth(username, password)
      .type('json')
      .expect(200);

    expect(typeof (res.body)).toBe('object');
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('ident');
    expect(res.body).toHaveProperty('username');
    expect(res.body).toHaveProperty('type');
    expect(res.body).toHaveProperty('email');
    expect(res.body).toHaveProperty('firstName');
    expect(res.body).toHaveProperty('lastName');
  });
  // Test for POST /user 200 endpoint
  test('POST new user - Success', async () => {
    const res = await request
      .post('/api/1.0/user')
      .auth(username, password)
      .type('json')
      .send(newUser)
      .expect(200);

    newUserIdent = res.body.ident;
  });
  // Test for POST /user 409 endpoint
  test('POST new user - Already existing', async () => {
    await request
      .post('/api/1.0/user')
      .auth(username, password)
      .type('json')
      .send(newUser)
      .expect(409);
  });
  // Test for POST /user 400 endpoint
  test('POST new user - Password is required for local', async () => {
    await request
      .post('/api/1.0/user')
      .auth(username, password)
      .type('json')
      .send({
        username: 'Testuser',
        type: 'local',
        email: 'testuser@test.com',
        firstName: 'FirstNameTest',
        lastName: 'LastNameTest',
      })
      .expect(400);
  });
  // Test for POST /user 400 endpoint
  test('POST new user - Password longer than 8 characters', async () => {
    await request
      .post('/api/1.0/user')
      .auth(username, password)
      .type('json')
      .send({
        username: 'Testuser',
        type: 'local',
        password: 'SMLLPD',
        email: 'testuser@test.com',
        firstName: 'FirstNameTest',
        lastName: 'LastNameTest',
      })
      .expect(400);
  });
  // Test for POST /user 400 endpoint
  test('POST new user - Email should be valid', async () => {
    await request
      .post('/api/1.0/user')
      .auth(username, password)
      .type('json')
      .send({
        username: 'Testuser',
        type: 'bcgsc',
        email: 'NOT_EMAIL',
        firstName: 'FirstNameTest',
        lastName: 'LastNameTest',
      })
      .expect(400);
  });
  // Test for POST /user 400 endpoint
  test('POST new user - Type should be eitheir local or bcgsc', async () => {
    await request
      .post('/api/1.0/user')
      .auth(username, password)
      .type('json')
      .send({
        username: 'Testuser',
        type: 'NOT_VALID_TYPE',
        email: 'testuser@test.com',
        firstName: 'FirstNameTest',
        lastName: 'LastNameTest',
      })
      .expect(400);
  });
  // Test for POST /user 400 endpoint
  test('POST new user - All fields are required', async () => {
    await request
      .post('/api/1.0/user')
      .auth(username, password)
      .type('json')
      .send({
        username: 'Testuser',
        type: 'bcgsc',
        email: 'testuser@test.com',
      })
      .expect(400);
  });
  // Tests for PUT /user/ident endpoint
  test('PUT user tests', async () => {
    // TODO: https://www.bcgsc.ca/jira/browse/DEVSU-831
  });
  // Test for DELETE /user/ident 204 endpoint
  test('DELETE user - Success', async () => {
    await request
      .delete(`/api/1.0/user/${newUserIdent}`)
      .auth(username, password)
      .type('json')
      .expect(204);
  });
  // Test for DELETE /user/ident 404 endpoint
  test('DELETE user - Not Found', async () => {
    await request
      .delete('/api/1.0/user/PROBABLY_NOT_A_USER')
      .auth(username, password)
      .type('json')
      .expect(404);
  });
  // Test for GET /user/settings 200 endpoint
  test('GET user settings', async () => {
    const res = await request
      .get('/api/1.0/user/settings')
      .auth(username, password)
      .type('json')
      .expect(200);

    expect(typeof res).toBe('object');
  });
  // Test for GET /user/search 200 endpoint
  test('GET search user', async () => {
    const res = await request
      .get('/api/1.0/user/search')
      .query({query: username})
      .auth(username, password)
      .type('json')
      .expect(200);

    expect(res.body.length >= 1);
  });
});

afterAll(async () => {
  await server.close();
});