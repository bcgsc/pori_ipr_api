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

afterAll(async () => {
  await server.close();
});