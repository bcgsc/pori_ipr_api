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
  'ident', 'createdAt', 'updatedAt', 'name', 'users',
];

const checkUserGroup = (groupObject) => {
  groupProperties.forEach((element) => {
    expect(groupObject).toHaveProperty(element);
  });
  expect(groupObject).toEqual(expect.not.objectContaining({
    id: expect.any(Number),
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

  group = await db.models.userGroup.create({name: 'Test group', description: 'test'});
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
  });
});

afterAll(async () => {
  // Delete group and users
  await db.models.userGroup.destroy({where: {ident: group.ident}, force: true});
  await db.models.user.destroy({where: {ident: [user01.ident, user02.ident]}, force: true});
  await server.close();
});
