const getPort = require('get-port');
const supertest = require('supertest');
const {v4: uuidv4} = require('uuid');
const HTTP_STATUS = require('http-status-codes');

const db = require('../../../app/models');
// get test user info
const CONFIG = require('../../../app/config');
const {listen} = require('../../../app');

CONFIG.set('env', 'test');
const {username, password} = CONFIG.get('testing');

const userProperties = [
  'ident', 'createdAt', 'updatedAt', 'username',
  'type', 'firstName', 'lastName', 'email',
];

const checkUser = (userObject) => {
  userProperties.forEach((element) => {
    expect(userObject).toHaveProperty(element);
  });
  expect(userObject).toEqual(expect.not.objectContaining({
    id: expect.any(Number),
    password: expect.any(String),
    deletedAt: expect.any(String),
  }));
};

const checkUsers = (users) => {
  users.forEach((user) => {
    checkUser(user);
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

// Tests for user related endpoints
describe('/user', () => {
  let testUser;

  beforeAll(async () => {
    // get test user
    testUser = await db.models.user.findOne({
      where: {username},
    });
  });

  describe('GET', () => {
    // Test for GET /user 200 endpoint
    test('/ - 200 Success', async () => {
      const res = await request
        .get('/api/user')
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      expect(Array.isArray(res.body)).toBe(true);
      checkUsers(res.body);
    });

    test('/{user} - 200 Success', async () => {
      const res = await request
        .get(`/api/user/${testUser.ident}`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      checkUser(res.body);
    });

    test('/{user} - 404 Not Found', async () => {
      await request
        .get(`/api/user/${uuidv4()}`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.NOT_FOUND);
    });

    // Test for GET /user/me 200 endpoint
    test('/me - 200 Success', async () => {
      const res = await request
        .get('/api/user/me')
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      checkUser(res.body);
    });

    // Test for GET /user/search 200 endpoint
    test('/search - 200 Success', async () => {
      // Create unique first name
      const firstName = 'randomFirstName01';
      // Create user
      const searchUser = await db.models.user.create({
        ident: uuidv4(),
        username: uuidv4(),
        firstName,
        lastName: 'searchLastName',
        email: 'search@email.com',
      });

      const res = await request
        .get('/api/user/search')
        .query({query: firstName})
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      checkUsers(res.body);
      expect(res.body[0].firstName).toBe(firstName);

      // Delete user
      await db.models.user.destroy({where: {ident: searchUser.ident}, force: true});
    });
  });

  describe('POST', () => {
    test('/ - 200 Success', async () => {
      const res = await request
        .post('/api/user')
        .auth(username, password)
        .type('json')
        .send({
          username: `Testuser-${uuidv4()}`,
          type: 'bcgsc',
          email: 'testuser@test.com',
          firstName: 'FirstNameTest',
          lastName: 'LastNameTest',
        })
        .expect(HTTP_STATUS.CREATED);

      // Remove test user from db
      await db.models.user.destroy({where: {ident: res.body.ident}, force: true});
    });

    test('/ - 409 Conflict - Username taken', async () => {
      await request
        .post('/api/user')
        .auth(username, password)
        .type('json')
        .send({
          username: testUser.username,
          type: 'bcgsc',
          email: 'testuser@test.com',
          firstName: 'FirstNameTest',
          lastName: 'LastNameTest',
        })
        .expect(HTTP_STATUS.CONFLICT);
    });

    test('/ - 400 Bad Request - Invalid type', async () => {
      await request
        .post('/api/user')
        .auth(username, password)
        .type('json')
        .send({
          username: 'Testuser',
          type: 'NOT_VALID_TYPE',
          email: 'testuser@test.com',
          firstName: 'FirstNameTest',
          lastName: 'LastNameTest',
        })
        .expect(HTTP_STATUS.BAD_REQUEST);
    });

    test('/ - 400 Bad Request - Email must be valid', async () => {
      await request
        .post('/api/user')
        .auth(username, password)
        .type('json')
        .send({
          username: 'Testuser',
          type: 'bcgsc',
          email: 'NOT_EMAIL',
          firstName: 'FirstNameTest',
          lastName: 'LastNameTest',
        })
        .expect(HTTP_STATUS.BAD_REQUEST);
    });

    test('/ - 400 Bad Request - All fields are required', async () => {
      await request
        .post('/api/user')
        .auth(username, password)
        .type('json')
        .send({
          username: 'Testuser',
          type: 'bcgsc',
          email: 'testuser@test.com',
        })
        .expect(HTTP_STATUS.BAD_REQUEST);
    });

    test('/ - 400 Bad Request - Password is required for local', async () => {
      await request
        .post('/api/user')
        .auth(username, password)
        .type('json')
        .send({
          username: 'Testuser',
          type: 'local',
          email: 'testuser@test.com',
          firstName: 'FirstNameTest',
          lastName: 'LastNameTest',
        })
        .expect(HTTP_STATUS.BAD_REQUEST);
    });

    test('/ - 400 Bad Request - Password must be more than 8 characters', async () => {
      await request
        .post('/api/user')
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
        .expect(HTTP_STATUS.BAD_REQUEST);
    });
  });

  describe('PUT', () => {
    let putTestUser;

    beforeEach(async () => {
      putTestUser = await db.models.user.create({
        username: `putTestUser-${uuidv4()}`,
        type: 'bcgsc',
        email: 'putTest@email.com',
        firstName: 'putTestFirstName',
        lastName: 'putTestLastName',
      });
    });

    afterEach(async () => {
      return db.models.user.destroy({where: {ident: putTestUser.ident}, force: true});
    });

    test('/{user} - 200 Success', async () => {
      const res = await request
        .put(`/api/user/${putTestUser.ident}`)
        .send({firstName: 'NewFirstName'})
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      checkUser(res.body);
      expect(res.body.firstName).toBe('NewFirstName');
    });

    test('/{user} - 400 Bad Request - Invalid email', async () => {
      await request
        .put(`/api/user/${putTestUser.ident}`)
        .send({email: 'INVALID_EMAIL'})
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.BAD_REQUEST);
    });
  });

  describe('DELETE', () => {
    let deleteTestUser;

    beforeEach(async () => {
      deleteTestUser = await db.models.user.create({
        username: uuidv4(),
        firstName: 'deleteFirstName01',
        lastName: 'deleteLastName01',
        email: 'delete@email.com',
      });
    });

    afterEach(async () => {
      return db.models.user.destroy({where: {ident: deleteTestUser.ident}, force: true});
    });

    test('/{user} - 204 Success', async () => {
      await request
        .delete(`/api/user/${deleteTestUser.ident}`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.NO_CONTENT);

      // Verify user is soft-deleted
      const deletedUser = await db.models.user.findOne({
        where: {ident: deleteTestUser.ident}, paranoid: false,
      });
      expect(deletedUser.deletedAt).not.toBeNull();
    });

    test('/{user} - 404 Not Found', async () => {
      await request
        .delete(`/api/user/${uuidv4()}`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.NOT_FOUND);
    });
  });
});

afterAll(async () => {
  global.gc && global.gc();
  await server.close();
});
