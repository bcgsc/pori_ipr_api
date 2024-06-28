const getPort = require('get-port');
const supertest = require('supertest');
const HTTP_STATUS = require('http-status-codes');
const {v4: uuidv4} = require('uuid');

const db = require('../../../app/models');
// get test user info
const CONFIG = require('../../../app/config');
const {listen} = require('../../../app');

CONFIG.set('env', 'test');
const {username, password} = CONFIG.get('testing');

const groupProperties = [
  'ident', 'createdAt', 'updatedAt', 'name', 'users', 'owner',
];

const checkUserGroup = (groupObject) => {
  groupProperties.forEach((element) => {
    expect(groupObject).toHaveProperty(element);
  });
  expect(groupObject).toEqual(expect.not.objectContaining({
    id: expect.any(Number),
    owner_id: expect.any(Number),
    deletedAt: expect.any(String),
    description: expect.any(String),
  }));
};

const checkUserGroups = (groups) => {
  groups.forEach((group) => {
    checkUserGroup(group);
  });
};

let server;
let request;

// Variables to be used for group tests
let user01;
let user02;
let group;

// Start API
beforeAll(async () => {
  const port = await getPort({port: CONFIG.get('web:port')});
  server = await listen(port);
  request = supertest(server);

  // make sure there are at least 2 users
  user01 = await db.models.user.create({
    ident: uuidv4(),
    username: uuidv4(),
    firstName: 'firstName01',
    lastName: 'lastName01',
    email: 'email01@email.com',
  });

  user02 = await db.models.user.create({
    ident: uuidv4(),
    username: uuidv4(),
    firstName: 'firstName02',
    lastName: 'lastName02',
    email: 'email02@email.com',
  });

  group = await db.models.userGroup.create({name: 'Test group', owner_id: user01.id, description: 'test'});
});

// Tests for user group related endpoints
describe('/user/group', () => {
  // Tests for GET endpoints
  describe('GET', () => {
    test('/ - 200 Success', async () => {
      const res = await request
        .get('/api/user/group')
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      checkUserGroups(res.body);
    });

    test('/{group} - 200 Success', async () => {
      await request
        .get(`/api/user/group/${group.ident}`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);
    });

    test('/{group} - 404 Not Found', async () => {
      await request
        .get(`/api/user/group/${uuidv4()}`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.NOT_FOUND);
    });
  });

  // Tests for POST endpoint
  describe('POST', () => {
    test('/ - 200 Success', async () => {
      const res = await request
        .post('/api/user/group')
        .auth(username, password)
        .type('json')
        .send({name: 'testGroup', owner: user02.ident})
        .expect(HTTP_STATUS.CREATED);

      checkUserGroup(res.body);

      await db.models.userGroup.destroy({where: {ident: res.body.ident}, force: true});
    });

    test('/ - 400 Bad Request - Name is required', async () => {
      await request
        .post('/api/user/group')
        .auth(username, password)
        .type('json')
        .send({owner: user02.ident})
        .expect(HTTP_STATUS.BAD_REQUEST);
    });

    test('/ - 400 Bad Request - Owner is required', async () => {
      await request
        .post('/api/user/group')
        .auth(username, password)
        .type('json')
        .send({name: 'testGroup'})
        .expect(HTTP_STATUS.BAD_REQUEST);
    });

    test('/ - 400 Bad Request - Owner must be a uuid', async () => {
      await request
        .post('/api/user/group')
        .auth(username, password)
        .type('json')
        .send({name: 'testGroup', owner: 'NOT_UUID'})
        .expect(HTTP_STATUS.BAD_REQUEST);
    });
  });

  // Tests for PUT endpoint
  describe('PUT', () => {
    let updateGroup;

    beforeEach(async () => {
      updateGroup = await db.models.userGroup.create({
        name: 'updateTestGroup', owner_id: user01.id,
      });
    });

    afterEach(async () => {
      return db.models.userGroup.destroy({where: {ident: updateGroup.ident}, force: true});
    });

    test('/{group} - 200 Success', async () => {
      const UPDATE_DATA = {name: 'testGroupUpdated', owner: user02.ident};

      const res = await request
        .put(`/api/user/group/${updateGroup.ident}`)
        .auth(username, password)
        .type('json')
        .send(UPDATE_DATA)
        .expect(HTTP_STATUS.OK);

      checkUserGroup(res.body);
      expect(res.body.name).toBe(UPDATE_DATA.name);
      expect(res.body.owner.ident).toBe(UPDATE_DATA.owner);
    });

    test('/{group} - 404 Not Found', async () => {
      await request
        .put(`/api/user/group/${updateGroup.ident}`)
        .auth(username, password)
        .type('json')
        .send({name: 'testGroup', owner: uuidv4()})
        .expect(HTTP_STATUS.NOT_FOUND);
    });

    test('/{group} - 400 Bad Request - Owner must be a uuid', async () => {
      await request
        .put(`/api/user/group/${updateGroup.ident}`)
        .auth(username, password)
        .type('json')
        .send({name: 'updatedGroup', owner: 'NOT_UUID'})
        .expect(HTTP_STATUS.BAD_REQUEST);
    });
  });

  // Tests for DELETE endpoint
  describe('DELETE', () => {
    let deleteGroup;

    beforeEach(async () => {
      deleteGroup = await db.models.userGroup.create({
        name: 'testGroup', owner_id: user01.id,
      });
    });

    afterEach(async () => {
      return db.models.userGroup.destroy({where: {ident: deleteGroup.ident}, force: true});
    });

    test('/{group} - 204 Success', async () => {
      await request
        .delete(`/api/user/group/${deleteGroup.ident}`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.NO_CONTENT);

      // Verify group is soft-deleted
      const delGroup = await db.models.userGroup.findOne({
        where: {ident: deleteGroup.ident}, paranoid: false,
      });
      expect(delGroup.deletedAt).not.toBeNull();
    });
  });
});

afterAll(async () => {
  // Delete group and users
  await db.models.userGroup.destroy({where: {ident: group.ident}, force: true});
  await db.models.user.destroy({where: {ident: [user01.ident, user02.ident]}, force: true});
  await server.close();
});
