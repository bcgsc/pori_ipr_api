process.env.NODE_ENV = 'test';

const getPort = require('get-port');
const supertest = require('supertest');
const HTTP_STATUS = require('http-status-codes');
const uuidv4 = require('uuid/v4');
const db = require('../app/models');

// get test user info
const CONFIG = require('../app/config');
const {listen} = require('../app');

CONFIG.set('env', 'test');

const {username, password} = CONFIG.get('testing');

let server;
let request;

// Variables to be used for group tests
let groupIdent;
let users;

// Start API
beforeAll(async () => {
  const port = await getPort({port: CONFIG.get('web:port')});
  server = await listen(port);
  request = supertest(server);

  users = await db.models.user.findAll();
});

afterAll(async () => {
  await server.close();
});

// Tests for user group related endpoints
describe('/user/group endpoint testing', () => {
  // Tests for GET endpoints
  describe('GET', () => {
    // Test for GET /user/group 200 endpoint
    test('GET / list of groups - 200 Success', async () => {
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

  // Tests for POST endpoint
  describe('POST', () => {
    // Test for POST /user/group 200 endpoint
    test('POST / - 200 Success', async () => {
      const res = await request
        .post('/api/1.0/user/group')
        .auth(username, password)
        .type('json')
        .send({name: 'testGroup', owner: users[1].ident})
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

      await db.models.userGroup.destroy({where: {ident: groupIdent}, force: true});
    });

    // Test for POST /user/group 400 endpoint
    test('POST / - 400 name is required', async () => {
      await request
        .post('/api/1.0/user/group')
        .auth(username, password)
        .type('json')
        .send({owner: users[1].ident})
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

  // Tests for DELETE endpoint
  describe('DELETE', () => {
    // Test for DELETE /user/group/:ident 204 endpoint
    test('DELETE /{group} group - 204 Success', async () => {
      // Create a group to be deleted in the same test
      const res = await request
        .post('/api/1.0/user/group')
        .auth(username, password)
        .type('json')
        .send({name: 'testGroup', owner: users[1].ident})
        .expect(HTTP_STATUS.OK);

      groupIdent = res.body.ident;

      await request
        .delete(`/api/1.0/user/group/${groupIdent}`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.NO_CONTENT);
    });

    // Test for DELETE /user/group/:ident 404 endpoint
    test('DELETE /{group} group - 404 Group not found', async () => {
      await request
        .delete('/api/1.0/user/group/PROBABLY_NOT_A_GROUP')
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.NOT_FOUND);
    });
  });

  // Tests for endpoints which requires a previous existing group
  describe('/user/group tests for new group dependent endpoints', () => {
    // Create the group and add two team members
    beforeAll(async () => {
      // Create the group
      const userGroup = await db.models.userGroup.create({name: 'testGroup', owner_id: users[0].id});
      groupIdent = userGroup.ident;

      // Add the first user and the test user to the group
      await db.models.userGroupMember.create({group_id: userGroup.id, user_id: users[0].id});
      await db.models.userGroupMember.create({group_id: userGroup.id, user_id: users[1].id});
    });

    // Delete group used for tests
    afterAll(async () => {
      await db.models.userGroup.destroy({where: {ident: groupIdent}, force: true});
    });

    // Tests for GET endpoint
    describe('GET', () => {
      // Test for GET /user/group/:ident 200 endpoint
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

      // Test for GET /user/group/:ident/member 200 endpoint
      test('GET /{group}/member all members of a group - 200 Success', async () => {
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

      // Test for GET /user/group/:ident/member 404 endpoint
      test('GET /{group}/member all members of a group - 404 Group not found', async () => {
        await request
          .get('/api/1.0/user/group/PROBABLY_NOT_A_GROUP/member')
          .auth(username, password)
          .type('json')
          .expect(HTTP_STATUS.NOT_FOUND);
      });
    });

    // Tests for PUT endpoint
    describe('PUT', () => {
      // Test for PUT /user/group/:ident 200 endpoint
      test('PUT /{group} specific group - 200 Success', async () => {
        const res = await request
          .put(`/api/1.0/user/group/${groupIdent}`)
          .send({name: 'newGroupName', owner: users[0].ident})
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
        expect(res.body.owner.ident).toEqual(users[0].ident);
        expect(res.body.owner.username).toEqual(users[0].username);
      });

      // Test for PUT /user/group/:ident 400 endpoint
      test('PUT /{group} specific group - 400 name is required', async () => {
        await request
          .put(`/api/1.0/user/group/${groupIdent}`)
          .send({owner: users[0].ident})
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

    // Tests for POST endpoint
    describe('POST', () => {
      // Test for POST /user/group/:ident/member 200 endpoint
      test('POST /{group}/member new group member - 200 Success', async () => {
        const res = await request
          .post(`/api/1.0/user/group/${groupIdent}/member`)
          .send({user: users[0].ident})
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

      // Test for POST /user/group/:ident/member 400 endpoint
      test('POST /{group}/member new group member - 400 Member should have uuid format', async () => {
        await request
          .post(`/api/1.0/user/group/${groupIdent}/member`)
          .send({user: 'NOT_UUID'})
          .auth(username, password)
          .type('json')
          .expect(HTTP_STATUS.BAD_REQUEST);
      });

      // Test for POST /user/group/:ident/member 404 endpoint
      test('POST /{group}/member new group member - 404 Member does not exist', async () => {
        await request
          .post(`/api/1.0/user/group/${groupIdent}/member`)
          .send({user: uuidv4()})
          .auth(username, password)
          .type('json')
          .expect(HTTP_STATUS.NOT_FOUND);
      });
    });

    // Tests for DELETE endpoint
    describe('DELETE', () => {
      // Test for DELETE /user/group/:ident/member 200 endpoint
      test('DELETE /{group}/member delete group member - 200 Success', async () => {
        await request
          .delete(`/api/1.0/user/group/${groupIdent}/member`)
          .send({user: users[0].ident})
          .auth(username, password)
          .type('json')
          .expect(HTTP_STATUS.NO_CONTENT);
      });

      // Test for DELETE /user/group/:ident/member 400 endpoint
      test('DELETE /{group}/member delete group member - 400 Member should have uuid format', async () => {
        await request
          .delete(`/api/1.0/user/group/${groupIdent}/member`)
          .send({user: 'NOT_UUID'})
          .auth(username, password)
          .type('json')
          .expect(HTTP_STATUS.BAD_REQUEST);
      });

      // Test for DELETE /user/group/:ident/member 404 endpoint
      test('DELETE /{group}/member delete group member - 404 Member does not exist', async () => {
        await request
          .delete(`/api/1.0/user/group/${groupIdent}/member`)
          .send({user: uuidv4()})
          .auth(username, password)
          .type('json')
          .expect(HTTP_STATUS.NOT_FOUND);
      });
    });
  });
});
