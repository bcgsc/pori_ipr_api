const getPort = require('get-port');
const supertest = require('supertest');
const HTTP_STATUS = require('http-status-codes');
const {v4: uuidv4} = require('uuid');

const db = require('../../../app/models');
// get test user info
const CONFIG = require('../../../app/config');
const {listen} = require('../../../app');

CONFIG.set('env', 'test');
const {username, managerUsername, password} = CONFIG.get('testing');

const checkUser = (userObject) => {
  expect(userObject).toEqual(expect.objectContaining({
    ident: expect.any(String),
    username: expect.any(String),
    type: expect.any(String),
    firstName: expect.any(String),
    lastName: expect.any(String),
    email: expect.any(String),
    createdAt: expect.any(String),
    updatedAt: expect.any(String),
  }));
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

// Variables to be used for group tests
let group;
let user01;
let user02;

// Start API
beforeAll(async () => {
  const port = await getPort({port: CONFIG.get('web:port')});
  server = await listen(port);
  request = supertest(server);

  // Create users
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

  // Create groups
  group = await db.models.userGroup.create({name: 'Test group', owner_id: user01.id});

  // Make users group members
  await db.models.userGroupMember.create({user_id: user01.id, group_id: group.id});
  await db.models.userGroupMember.create({user_id: user02.id, group_id: group.id});
});

// Tests for user group member related endpoints
describe('/user/group/{group}/member', () => {
  // Tests for GET endpoint
  describe('GET', () => {
    test('/ - 200 Success', async () => {
      const res = await request
        .get(`/api/user/group/${group.ident}/member`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      checkUsers(res.body);
    });
  });

  // Tests for POST endpoint
  describe('POST', () => {
    test('/ - 200 Success', async () => {
      // Create user
      const updateUser = await db.models.user.create({
        ident: uuidv4(),
        username: uuidv4(),
        firstName: 'updateUserFirstName',
        lastName: 'updateUserLastName',
        email: 'updateUser@email.com',
      });

      const res = await request
        .post(`/api/user/group/${group.ident}/member`)
        .auth(username, password)
        .type('json')
        .send({user: updateUser.ident})
        .expect(HTTP_STATUS.CREATED);

      checkUser(res.body);

      // Check user belongs to group
      const groupIdents = res.body.groups.map((g) => {
        return g.ident;
      });
      expect(groupIdents.includes(group.ident)).toBe(true);

      // Remove user
      await db.models.user.destroy({where: {ident: updateUser.ident}, force: true});
    });

    test('/ - 400 Bad Request - User is required', async () => {
      await request
        .post(`/api/user/group/${group.ident}/member`)
        .auth(username, password)
        .type('json')
        .send({})
        .expect(HTTP_STATUS.BAD_REQUEST);
    });

    test('/ - 400 Bad Request - User must be a uuid', async () => {
      await request
        .post(`/api/user/group/${group.ident}/member`)
        .auth(username, password)
        .type('json')
        .send({user: 'NOT_UUID'})
        .expect(HTTP_STATUS.BAD_REQUEST);
    });

    test('/ - 403 Forbidden - Non-admin user may not give admin role', async () => {
      const nonAdminUser = await db.models.user.create({
        ident: uuidv4(),
        username: uuidv4(),
        firstName: 'nonAdminFirstName',
        lastName: 'nonAdminLastName',
        email: 'updateUser@email.com',
      });

      console.log(managerUsername);
      const req = await request
        .post('/api/user/group/admin/member')
        .auth(managerUsername, password)
        .type('json')
        .send({user: nonAdminUser.ident})
        .expect(HTTP_STATUS.FORBIDDEN);
      console.log('req');
      console.dir(req.body);

      await db.models.user.destroy({where: {ident: nonAdminUser.ident}, force: true});
    });

    test('/ - 404 Not Found - User does not exist', async () => {
      await request
        .post(`/api/user/group/${group.ident}/member`)
        .auth(username, password)
        .type('json')
        .send({user: uuidv4()})
        .expect(HTTP_STATUS.NOT_FOUND);
    });
  });

  // Tests for DELETE endpoint
  describe('DELETE', () => {
    let deleteUser;

    beforeEach(async () => {
      deleteUser = await db.models.user.create({
        ident: uuidv4(),
        username: uuidv4(),
        firstName: 'deleteUserFirstName',
        lastName: 'deleteUserLastName',
        email: 'deleteUser@email.com',
      });

      await db.models.userGroupMember.create({
        user_id: deleteUser.id, group_id: group.id,
      });
    });

    afterEach(async () => {
      return db.models.user.destroy({where: {ident: deleteUser.ident}, force: true});
    });

    test('/ - 204 Success', async () => {
      await request
        .delete(`/api/user/group/${group.ident}/member`)
        .auth(username, password)
        .type('json')
        .send({user: deleteUser.ident})
        .expect(HTTP_STATUS.NO_CONTENT);

      // Verify group-member association is deleted
      const delGroupMember = await db.models.userGroupMember.findOne({
        where: {user_id: deleteUser.id, group_id: group.id}, paranoid: false,
      });
      expect(delGroupMember.deletedAt).not.toBeNull();
    });

    test('/ - 400 Bad Request', async () => {
      await request
        .delete(`/api/user/group/${group.ident}/member`)
        .auth(username, password)
        .type('json')
        .send({user: 'INVALID_UUID'})
        .expect(HTTP_STATUS.BAD_REQUEST);
    });

    test('/ - 403 Forbidden - non-admin may not edit admin user', async () => {
      await request
        .delete(`/api/user/group/${group.ident}/member`)
        .auth(username, password)
        .type('json')
        .send({user: 'INVALID_UUID'})
        .expect(HTTP_STATUS.BAD_REQUEST);
    });

    test('/ - 404 Not Found - User does not exist', async () => {
      await request
        .delete(`/api/user/group/${group.ident}/member`)
        .auth(username, password)
        .type('json')
        .send({user: uuidv4()})
        .expect(HTTP_STATUS.NOT_FOUND);
    });

    test('/ - 404 Not Found - User is not group member', async () => {
      // Delete group-member binding
      await db.models.userGroupMember.destroy({
        where: {user_id: deleteUser.id, group_id: group.id},
      });

      await request
        .delete(`/api/user/group/${group.ident}/member`)
        .auth(username, password)
        .type('json')
        .send({user: deleteUser.ident})
        .expect(HTTP_STATUS.NOT_FOUND);
    });
  });
});

afterAll(async () => {
  await db.models.userGroup.destroy({where: {ident: group.ident}, force: true});
  await db.models.user.destroy({where: {ident: [user01.ident, user02.ident]}, force: true});
  await server.close();
});
