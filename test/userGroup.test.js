process.env.NODE_ENV = 'test';

const getPort = require('get-port');
const supertest = require('supertest');
const HTTP_STATUS = require('http-status-codes');

// get test user info
const CONFIG = require('../app/config');
const {listen} = require('../app');

CONFIG.set('env', 'test');

const {username, password} = CONFIG.get('testing');

let server;
let request;

// Start API
beforeAll(async () => {
  const port = await getPort({port: CONFIG.get('web:port')});
  server = await listen(port);
  request = supertest(server);
});

// Tests for user related endpoints
describe('/user/group', () => {
  describe('GET', () => {
    // Test for GET /user 200 endpoint
    test('GET / list of groups', async () => {
      const res = await request
        .get('/api/1.0/user/group')
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      expect(res.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            ident: expect.any(String),
            name: expect.any(String),
            owner_id: expect.any(Number),
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
            users: expect.any(Array),
          }),
        ])
      );
    });
  });
});

afterAll(async () => {
  await server.close();
});
