const getPort = require('get-port');
const supertest = require('supertest');
const HTTP_STATUS = require('http-status-codes');
const {v4: uuidv4} = require('uuid');

const db = require('../../../app/models');
// get test user info
const CONFIG = require('../../../app/config');
const {listen} = require('../../../app');

CONFIG.set('env', 'test');
const {username, managerUsername, bioinformaticianUsername, password} = CONFIG.get('testing');

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
let adminGroup;
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

  group = {name: 'germline access'};
  adminGroup = {name: 'admin'};

  // Make users group members
  await db.models.userGroup.create({userId: user01.id, name: group.name});
  await db.models.userGroup.create({userId: user02.id, name: group.name});
});

// Tests for user group member related endpoints
describe('/user/group/{group}/member', () => {
  // Tests for GET endpoint
  describe('GET', () => {
    test('/ - 200 Success', async () => {
      const res = await request
        .get(`/api/user/group/${group.name}/member`)
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
        .post(`/api/user/group/${group.name}/member`)
        .auth(username, password)
        .type('json')
        .send({user: updateUser.ident})
        .expect(HTTP_STATUS.CREATED);

      checkUser(res.body);

      // Check user belongs to group
      const groupNames = res.body.groups.map((g) => {
        return g.name;
      });
      expect(groupNames.includes(group.name)).toBe(true);

      // Remove user
      await db.models.user.destroy({where: {ident: updateUser.ident}, force: true});
    });

    test('/ - 200 Success by manager', async () => {
      // Create user
      const updateUser = await db.models.user.create({
        ident: uuidv4(),
        username: uuidv4(),
        firstName: 'updateUserFirstName',
        lastName: 'updateUserLastName',
        email: 'updateUser@email.com',
      });

      const res = await request
        .post(`/api/user/group/${group.name}/member`)
        .auth(managerUsername, password)
        .type('json')
        .send({user: updateUser.ident})
        .expect(HTTP_STATUS.CREATED);

      checkUser(res.body);

      // Check user belongs to group
      const groupNames = res.body.groups.map((g) => {
        return g.name;
      });
      expect(groupNames.includes(group.name)).toBe(true);

      // Remove user
      await db.models.user.destroy({where: {ident: updateUser.ident}, force: true});
    });

    test('/ - 403 forbidden to non-admin to give admin role', async () => {
      // Create user
      const updateUser = await db.models.user.create({
        ident: uuidv4(),
        username: uuidv4(),
        firstName: 'updateUser1FirstName',
        lastName: 'updateUser1LastName',
        email: 'updateUser1@email.com',
      });

      await request
        .post(`/api/user/group/${adminGroup.name}/member`)
        .auth(managerUsername, password)
        .type('json')
        .send({user: updateUser.ident})
        .expect(HTTP_STATUS.FORBIDDEN);

      // Remove user
      await db.models.user.destroy({where: {ident: updateUser.ident}, force: true});
    });

    test('/ - 403 forbidden to non-admin to give role to admin user', async () => {
      // Create user
      const updateUser = await db.models.user.create({
        ident: uuidv4(),
        username: uuidv4(),
        firstName: 'updateUser2FirstName',
        lastName: 'updateUser2LastName',
        email: 'updateUser2@email.com',
      });

      await db.models.userGroup.create({userId: updateUser.id, name: adminGroup.name});
      await request
        .post(`/api/user/group/${group.name}/member`)
        .auth(managerUsername, password)
        .type('json')
        .send({user: updateUser.ident})
        .expect(HTTP_STATUS.FORBIDDEN);

      // Remove user
      await db.models.user.destroy({where: {ident: updateUser.ident}, force: true});
    });

    test('/ - 403 forbidden to bioinformatician', async () => {
      // Create user
      const updateUser = await db.models.user.create({
        ident: uuidv4(),
        username: uuidv4(),
        firstName: 'updateUserFirstName',
        lastName: 'updateUserLastName',
        email: 'updateUser@email.com',
      });

      await request
        .post(`/api/user/group/${group.name}/member`)
        .auth(bioinformaticianUsername, password)
        .type('json')
        .send({user: updateUser.ident})
        .expect(HTTP_STATUS.FORBIDDEN);

      // Remove user
      await db.models.user.destroy({where: {ident: updateUser.ident}, force: true});
    });

    test('/ - 400 Bad Request - User is required', async () => {
      await request
        .post(`/api/user/group/${group.name}/member`)
        .auth(username, password)
        .type('json')
        .send({})
        .expect(HTTP_STATUS.BAD_REQUEST);
    });

    test('/ - 400 Bad Request - User must be a uuid', async () => {
      await request
        .post(`/api/user/group/${group.name}/member`)
        .auth(username, password)
        .type('json')
        .send({user: 'NOT_UUID'})
        .expect(HTTP_STATUS.BAD_REQUEST);
    });

    test('/ - 404 Not Found - User does not exist', async () => {
      await request
        .post(`/api/user/group/${group.name}/member`)
        .auth(username, password)
        .type('json')
        .send({user: uuidv4()})
        .expect(HTTP_STATUS.NOT_FOUND);
    });
  });

  // Tests for DELETE endpoint
  describe('DELETE', () => {
    let deleteUser;
    let deleteUser2;
    let adminDeleteUser;

    beforeEach(async () => {
      deleteUser = await db.models.user.create({
        ident: uuidv4(),
        username: uuidv4(),
        firstName: 'deleteUserFirstName',
        lastName: 'deleteUserLastName',
        email: 'deleteUser@email.com',
      });

      deleteUser2 = await db.models.user.create({
        ident: uuidv4(),
        username: uuidv4(),
        firstName: 'deleteUser2FirstName',
        lastName: 'deleteUser2LastName',
        email: 'deleteUser2@email.com',
      });

      adminDeleteUser = await db.models.user.create({
        ident: uuidv4(),
        username: uuidv4(),
        firstName: 'deleteUser1FirstName',
        lastName: 'deleteUser1LastName',
        email: 'deleteUser1@email.com',
      });

      await db.models.userGroup.create({
        userId: deleteUser.id, name: group.name,
      });
      await db.models.userGroup.create({
        userId: deleteUser2.id, name: group.name,
      });
      await db.models.userGroup.create({
        userId: adminDeleteUser.id, name: group.name,
      });
      await db.models.userGroup.create({
        userId: adminDeleteUser.id, name: adminGroup.name,
      });
    });

    afterEach(async () => {
      await db.models.user.destroy({where: {ident: deleteUser.ident}, force: true});
      await db.models.user.destroy({where: {ident: deleteUser2.ident}, force: true});
      await db.models.user.destroy({where: {ident: adminDeleteUser.ident}, force: true});
    });

    test('/ - 204 Success', async () => {
      await request
        .delete(`/api/user/group/${group.name}/member`)
        .auth(username, password)
        .type('json')
        .send({user: deleteUser.ident})
        .expect(HTTP_STATUS.NO_CONTENT);

      // Verify group-member association is deleted
      const delGroupMember = await db.models.userGroup.findOne({
        where: {userId: deleteUser.id, name: group.name}, paranoid: false,
      });
      expect(delGroupMember.deletedAt).not.toBeNull();
    });

    test('/ - 204 Success by manager', async () => {
      await request
        .delete(`/api/user/group/${group.name}/member`)
        .auth(managerUsername, password)
        .type('json')
        .send({user: deleteUser2.ident})
        .expect(HTTP_STATUS.NO_CONTENT);

      // Verify group-member association is deleted
      const delGroupMember = await db.models.userGroup.findOne({
        where: {userId: deleteUser2.id, name: group.name}, paranoid: false,
      });
      expect(delGroupMember.deletedAt).not.toBeNull();
    });

    test('/ - 403 forbidden to non-admin to remove admin role', async () => {
      await request
        .delete(`/api/user/group/${adminGroup.name}/member`)
        .auth(managerUsername, password)
        .type('json')
        .send({user: adminDeleteUser.ident})
        .expect(HTTP_STATUS.FORBIDDEN);
    });

    test('/ - 403 forbidden to non-admin to remove any role from admin user', async () => {
      await request
        .delete(`/api/user/group/${group.name}/member`)
        .auth(managerUsername, password)
        .type('json')
        .send({user: adminDeleteUser.ident})
        .expect(HTTP_STATUS.FORBIDDEN);
    });

    test('/ - 403 forbidden to bioinformatician', async () => {
      await request
        .delete(`/api/user/group/${group.name}/member`)
        .auth(bioinformaticianUsername, password)
        .type('json')
        .send({user: deleteUser.ident})
        .expect(HTTP_STATUS.FORBIDDEN);
    });

    test('/ - 400 Bad Request', async () => {
      await request
        .delete(`/api/user/group/${group.name}/member`)
        .auth(username, password)
        .type('json')
        .send({user: 'INVALID_UUID'})
        .expect(HTTP_STATUS.BAD_REQUEST);
    });

    test('/ - 404 Not Found - User does not exist', async () => {
      await request
        .delete(`/api/user/group/${group.name}/member`)
        .auth(username, password)
        .type('json')
        .send({user: uuidv4()})
        .expect(HTTP_STATUS.NOT_FOUND);
    });

    test('/ - 404 Not Found - User is not group member', async () => {
      // Delete group-member binding
      await db.models.userGroup.destroy({
        where: {userId: deleteUser.id, name: group.name},
      });

      await request
        .delete(`/api/user/group/${group.name}/member`)
        .auth(username, password)
        .type('json')
        .send({user: deleteUser.ident})
        .expect(HTTP_STATUS.NOT_FOUND);
    });
  });
});

afterAll(async () => {
  await db.models.user.destroy({where: {ident: [user01.ident, user02.ident]}, force: true});
  await server.close();
});
