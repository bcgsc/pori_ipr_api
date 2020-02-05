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

let groupIdent;
let testUserUUID;

// Start API
beforeAll(async () => {
  const port = await getPort({port: CONFIG.get('web:port')});
  server = await listen(port);
  request = supertest(server);

  const res = await request
    .get('/api/1.0/user/me')
    .auth(username, password)
    .type('json')
    .expect(HTTP_STATUS.OK);

  testUserUUID = res.body.ident;
});

// Tests for user related endpoints
describe('/user/group', () => {
  describe('GET', () => {
    // Test for GET /user/group 200 endpoint
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

    // Test for GET /user/group/:ident 404 endpoint
    test('GET /ident group - Not Found', async () => {
      const res = await request
        .get('/api/1.0/user/group/PROBABLY_NOT_A_GROUP')
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.NOT_FOUND);
    });
  });

  describe('POST', () => {
    // Test for POST /user/group 200 endpoint
    test('POST /user/group - 200 Success', async () => {
      const res = await request
        .post('/api/1.0/user/group')
        .auth(username, password)
        .type('json')
        .send({name: 'testGroup', owner: testUserUUID})
        .expect(HTTP_STATUS.OK);

      groupIdent = res.body.ident;

      expect(res.body).toEqual(expect.objectContaining({
        ident: expect.any(String),
        name: expect.any(String),
        owner_id: expect.any(Number),
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
        users: expect.any(Array),
        owner: expect.any(Object),
      }));

      await request
        .delete(`/api/1.0/user/group/${groupIdent}`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.NO_CONTENT);
    });

    test('POST /user/group - 400 name is required', async () => {
      await request
        .post('/api/1.0/user/group')
        .auth(username, password)
        .type('json')
        .send({owner: testUserUUID})
        .expect(HTTP_STATUS.BAD_REQUEST);
    });

    test('POST /user/group - 400 owner should have UUID format', async () => {
      await request
        .post('/api/1.0/user/group')
        .auth(username, password)
        .type('json')
        .send({name: 'testGroup', owner: 'NOT_UUID'})
        .expect(HTTP_STATUS.BAD_REQUEST);
    });
  });

  describe('DELETE', () => {
    // Test for DELETE /user/group/:ident 204 endpoint
    test('DELETE /ident group', async () => {
      const res = await request
        .post('/api/1.0/user/group')
        .auth(username, password)
        .type('json')
        .send({name: 'testGroup', owner: testUserUUID})
        .expect(HTTP_STATUS.OK);

      groupIdent = res.body.ident;

      await request
        .delete(`/api/1.0/user/group/${groupIdent}`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.NO_CONTENT);
    });
  });

  describe('/user/group tests for new group dependent endpoints', () => {
    beforeAll(async () => {
      const res = await request
        .post('/api/1.0/user/group')
        .auth(username, password)
        .type('json')
        .send({name: 'testGroup', owner: testUserUUID})
        .expect(HTTP_STATUS.OK);

      groupIdent = res.body.ident;
    });

    // Test for DELETE /user/group/:ident 204 endpoint
    test('DELETE /ident group', async () => {
      
    });

    afterAll(async () => {
      await request
        .delete(`/api/1.0/user/group/${groupIdent}`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.NO_CONTENT);
    });
  });
});

afterAll(async () => {
  await server.close();
});
