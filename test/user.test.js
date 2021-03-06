const getPort = require('get-port');
const supertest = require('supertest');
const uuidv4 = require('uuid/v4');
const HTTP_STATUS = require('http-status-codes');

const db = require('../app/models');

// get test user info
const CONFIG = require('../app/config');
const {listen} = require('../app');

CONFIG.set('env', 'test');

const {username, password} = CONFIG.get('testing');

let newUser;

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
  describe('GET', () => {
    // Test for GET /user 200 endpoint
    test('GET list of users', async () => {
      const res = await request
        .get('/api/user')
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      expect(res.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            ident: expect.any(String),
            username: expect.any(String),
            type: expect.any(String),
            email: expect.any(String),
            firstName: expect.any(String),
            lastName: expect.any(String),
          }),
        ])
      );
    });

    // Test for GET /user/me 200 endpoint
    test('GET current user /me', async () => {
      const res = await request
        .get('/api/user/me')
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      expect(res.body).toEqual(
        expect.objectContaining({
          ident: expect.any(String),
          username: expect.any(String),
          type: expect.any(String),
          email: expect.any(String),
          firstName: expect.any(String),
          lastName: expect.any(String),
        })
      );
    });

    // Test for GET /user/settings 200 endpoint
    test('GET user settings', async () => {
      const res = await request
        .get('/api/user/settings')
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      expect(typeof res).toBe('object');
    });

    // Test for GET /user/search 200 endpoint
    test('GET search user', async () => {
      const res = await request
        .get('/api/user/search')
        .query({query: username})
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('POST', () => {
    // Test for POST /user 200 endpoint
    test('POST new user - Success', async () => {
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

    // Test for POST /user 400 endpoint
    test('POST new user - Password is required for local', async () => {
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

    // Test for POST /user 400 endpoint
    test('POST new user - Password longer than 8 characters', async () => {
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

    // Test for POST /user 400 endpoint
    test('POST new user - Email should be valid', async () => {
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

    // Test for POST /user 400 endpoint
    test('POST new user - Type should be either local or bcgsc', async () => {
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

    // Test for POST /user 400 endpoint
    test('POST new user - All fields are required', async () => {
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
  });

  describe('PUT', () => {
    let putTestUser;

    beforeEach(async () => {
      putTestUser = await db.models.user.create({
        username: `putTestUser-${uuidv4()}`,
      });
    });

    afterEach(async () => {
      await db.models.user.destroy({where: {ident: putTestUser.ident}, force: true});
    });

    // Test successful update
    // Test update not creating a new record (check that result has changed, but no new record is added (paranoid: false))
    test('/{user} - 200 successful update', async () => {
      const res = await request
        .put(`/api/user/${putTestUser.ident}`)
        .send({firstName: 'NewFirstName'})
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      expect(res.body.firstName).toBe('NewFirstName');
    });

    test('/{user} - 200 success update, but new db record is not created', async () => {
      const intialResults = await db.models.user.findAll({where: {ident: putTestUser.ident}, paranoid: false});

      await request
        .put(`/api/user/${putTestUser.ident}`)
        .send({settings: {testSetting: true}})
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      // Verify update was successful
      const result = await db.models.user.findOne({where: {ident: putTestUser.ident}});
      expect(result.settings).toEqual({testSetting: true});

      const updateResults = await db.models.user.findAll({where: {ident: putTestUser.ident}, paranoid: false});
      // Verify a new record wasn't added on update
      expect(intialResults.length).toEqual(updateResults.length);
    });
  });

  describe('DELETE', () => {
    // Test for DELETE /user/ident 404 endpoint
    let deleteTestUser;

    // Create a unique user for each of the tests
    beforeEach(async () => {
      const deleteUserData = {
        username: `Testuser-${uuidv4()}`,
        type: 'bcgsc',
        email: 'testuser@test.com',
        firstName: 'FirstNameTest',
        lastName: 'LastNameTest',
      };

      deleteTestUser = await db.models.user.create(deleteUserData);
    });

    // Delete the user after each test
    afterEach(async () => {
      await db.models.user.destroy({where: {ident: deleteTestUser.ident}, force: true});
    });

    test('DELETE user - Not Found', async () => {
      await request
        .delete('/api/user/PROBABLY_NOT_A_USER')
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.NOT_FOUND);
    });

    // Test for DELETE /user/ident 204 endpoint
    test('DELETE user - Success', async () => {
      await request
        .delete(`/api/user/${deleteTestUser.ident}`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.NO_CONTENT);
    });
  });

  describe('/user tests for new user dependent endpoints', () => {
    let putTestUser;

    // Create a unique user for each of the tests
    beforeEach(async () => {
      newUser = {
        username: `Testuser-${uuidv4()}`,
        type: 'bcgsc',
        email: 'testuser@test.com',
        firstName: 'FirstNameTest',
        lastName: 'LastNameTest',
      };

      putTestUser = await db.models.user.create(newUser);
    });

    // Delete the user after each test
    afterEach(async () => {
      await db.models.user.destroy({where: {ident: putTestUser.ident}, force: true});
    });

    // Test for POST /user 409 endpoint
    test('POST new user - Already existing', async () => {
      await request
        .post('/api/user')
        .auth(username, password)
        .type('json')
        .send(newUser)
        .expect(HTTP_STATUS.CONFLICT);
    });

    describe('PUT', () => {
      // Tests for PUT /user/ident endpoint
      test.todo('PUT user tests - https://www.bcgsc.ca/jira/browse/DEVSU-831');
    });
  });
});

afterAll(async () => {
  await server.close();
});
