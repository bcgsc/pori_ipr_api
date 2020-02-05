process.env.NODE_ENV = 'test';

const getPort = require('get-port');
const supertest = require('supertest');
const HTTP_STATUS = require('http-status-codes');
const uuidv4 = require('uuid/v4');

// get test user info
const CONFIG = require('../app/config');
const {listen} = require('../app');

CONFIG.set('env', 'test');

const {username, password} = CONFIG.get('testing');

let server;
let request;

let groupIdent;
let testUserIdent;
let newMemberIdent;
let newMemberUsername;

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

  testUserIdent = res.body.ident;
});

// Tests for user related endpoints
describe('/user/group endpoint testing', () => {
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
    test('GET /{group} group - 404 Not Found', async () => {
      await request
        .get('/api/1.0/user/group/PROBABLY_NOT_A_GROUP')
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.NOT_FOUND);
    });
  });

  describe('POST', () => {
    // Test for POST /user/group 200 endpoint
    test('POST / - 200 Success', async () => {
      const res = await request
        .post('/api/1.0/user/group')
        .auth(username, password)
        .type('json')
        .send({name: 'testGroup', owner: testUserIdent})
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

    test('POST / - 400 name is required', async () => {
      await request
        .post('/api/1.0/user/group')
        .auth(username, password)
        .type('json')
        .send({owner: testUserIdent})
        .expect(HTTP_STATUS.BAD_REQUEST);
    });

    test('POST / - 400 owner is required', async () => {
      await request
        .post('/api/1.0/user/group')
        .auth(username, password)
        .type('json')
        .send({name: 'testGroup'})
        .expect(HTTP_STATUS.BAD_REQUEST);
    });

    test('POST / - 400 owner should have uuid format', async () => {
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
    test('DELETE /{group} group - 200 Success', async () => {
      const res = await request
        .post('/api/1.0/user/group')
        .auth(username, password)
        .type('json')
        .send({name: 'testGroup', owner: testUserIdent})
        .expect(HTTP_STATUS.OK);

      groupIdent = res.body.ident;

      await request
        .delete(`/api/1.0/user/group/${groupIdent}`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.NO_CONTENT);
    });

    test('DELETE /{group} group - 404 Group not found', async () => {
      await request
        .delete('/api/1.0/user/group/PROBABLY_NOT_A_GROUP')
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.NOT_FOUND);
    });
  });

  describe('/user/group tests for new group dependent endpoints', () => {
    beforeAll(async () => {
      let res = await request
        .post('/api/1.0/user/group')
        .auth(username, password)
        .type('json')
        .send({name: 'testGroup', owner: testUserIdent})
        .expect(HTTP_STATUS.OK);

      groupIdent = res.body.ident;

      res = await request
        .get('/api/1.0/user')
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      expect(Array.isArray(res.body)).toBe(true);
      newMemberIdent = res.body[0].ident;
      newMemberUsername = res.body[0].username;

      await request
        .post(`/api/1.0/user/group/${groupIdent}/member`)
        .auth(username, password)
        .type('json')
        .send({user: newMemberIdent})
        .expect(HTTP_STATUS.OK);
      await request
        .post(`/api/1.0/user/group/${groupIdent}/member`)
        .auth(username, password)
        .type('json')
        .send({user: testUserIdent})
        .expect(HTTP_STATUS.OK);
    });

    describe('GET', () => {
      test('GET /{group} specific group - 200 Success', async () => {
        const res = await request
          .get(`/api/1.0/user/group/${groupIdent}`)
          .auth(username, password)
          .type('json')
          .expect(HTTP_STATUS.OK);

        expect(res.body).toEqual(expect.objectContaining({
          ident: expect.any(String),
          name: expect.any(String),
          owner_id: expect.any(Number),
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
          users: expect.any(Array),
          owner: expect.any(Object),
        }));
      });

      test('GET /{group}/member member of a group - 200 Success', async () => {
        const res = await request
          .get(`/api/1.0/user/group/${groupIdent}/member`)
          .auth(username, password)
          .type('json')
          .expect(HTTP_STATUS.OK);

        expect(res.body).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              ident: expect.any(String),
              username: expect.any(String),
              createdAt: expect.any(String),
              updatedAt: expect.any(String),
              type: expect.any(String),
              firstName: expect.any(String),
              lastName: expect.any(String),
              email: expect.any(String),
              userGroupMember: expect.any(Object),
            }),
          ])
        );
      });
    });

    describe('PUT', () => {
      test('PUT /{group} specific group - 200 Success', async () => {
        const res = await request
          .put(`/api/1.0/user/group/${groupIdent}`)
          .send({name: 'newGroupName', owner: newMemberIdent})
          .auth(username, password)
          .type('json')
          .expect(HTTP_STATUS.OK);

        expect(res.body).toEqual(expect.objectContaining({
          ident: expect.any(String),
          name: expect.any(String),
          owner_id: expect.any(Number),
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
          users: expect.any(Array),
          owner: expect.any(Object),
        }));
        expect(res.body.name).toEqual('newGroupName');
        expect(res.body.owner.ident).toEqual(newMemberIdent);
        expect(res.body.owner.username).toEqual(newMemberUsername);
      });

      test('PUT /{group} specific group - 400 name is required', async () => {
        await request
          .put(`/api/1.0/user/group/${groupIdent}`)
          .send({owner: newMemberIdent})
          .auth(username, password)
          .type('json')
          .expect(HTTP_STATUS.BAD_REQUEST);
      });

      test('PUT /{group} specific group - 400 owner is required', async () => {
        await request
          .put(`/api/1.0/user/group/${groupIdent}`)
          .send({name: 'newGroupName'})
          .auth(username, password)
          .type('json')
          .expect(HTTP_STATUS.BAD_REQUEST);
      });

      test('PUT /{group} specific group - 400 owner should have uuid format', async () => {
        await request
          .put(`/api/1.0/user/group/${groupIdent}`)
          .send({name: 'newGroupName', owner: 'NOT_UUID'})
          .auth(username, password)
          .type('json')
          .expect(HTTP_STATUS.BAD_REQUEST);
      });
    });

    describe('POST', () => {
      test('POST /{group}/member new group member - 200 Success', async () => {
        const res = await request
          .post(`/api/1.0/user/group/${groupIdent}/member`)
          .send({user: newMemberIdent})
          .auth(username, password)
          .type('json')
          .expect(HTTP_STATUS.OK);

        expect(res.body).toEqual(expect.objectContaining({
          ident: expect.any(String),
          username: expect.any(String),
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
          type: expect.any(String),
          firstName: expect.any(String),
          lastName: expect.any(String),
          email: expect.any(String),
          userGroupMember: expect.any(Object),
        }));
      });

      test('POST /{group}/member new group member - 400 Member should have uuid format', async () => {
        await request
          .post(`/api/1.0/user/group/${groupIdent}/member`)
          .send({user: 'NOT_UUID'})
          .auth(username, password)
          .type('json')
          .expect(HTTP_STATUS.BAD_REQUEST);
      });

      test('POST /{group}/member new group member - 404 Member does not exist', async () => {
        await request
          .post(`/api/1.0/user/group/${groupIdent}/member`)
          .send({user: uuidv4()})
          .auth(username, password)
          .type('json')
          .expect(HTTP_STATUS.NOT_FOUND);
      });
    });

    describe('DELETE', () => {
      test('DELETE /{group}/member delete group member - 200 Success', async () => {
        await request
          .delete(`/api/1.0/user/group/${groupIdent}/member`)
          .send({user: newMemberIdent})
          .auth(username, password)
          .type('json')
          .expect(HTTP_STATUS.NO_CONTENT);
      });

      test('DELETE /{group}/member delete group member - 400 Member should have uuid format', async () => {
        await request
          .delete(`/api/1.0/user/group/${groupIdent}/member`)
          .send({user: 'NOT_UUID'})
          .auth(username, password)
          .type('json')
          .expect(HTTP_STATUS.BAD_REQUEST);
      });

      test('DELETE /{group}/member delete group member - 404 Member does not exist', async () => {
        await request
          .delete(`/api/1.0/user/group/${groupIdent}/member`)
          .send({user: uuidv4()})
          .auth(username, password)
          .type('json')
          .expect(HTTP_STATUS.NOT_FOUND);
      });
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
