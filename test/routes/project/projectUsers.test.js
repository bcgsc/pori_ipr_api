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

const checkProjectUsers = (users) => {
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

// Tests for project user endpoints
describe('/project/:project/user', () => {
  let testUser;
  let project;
  let user01;
  let user02;

  beforeAll(async () => {
    // get test user
    testUser = await db.models.user.findOne({
      where: {username},
    });

    // Create project
    project = await db.models.project.create({name: 'user-project-test01'});

    // Create users
    user01 = await db.models.user.create({
      ident: uuidv4(),
      username: uuidv4(),
      firstName: 'userProjectUser01',
      lastName: 'userProjectUser01',
      email: 'userProjectUser01@email.com',
    });

    user02 = await db.models.user.create({
      ident: uuidv4(),
      username: uuidv4(),
      firstName: 'userProjectUser02',
      lastName: 'userProjectUser02',
      email: 'userProjectUser02@email.com',
    });

    // Bind users to project
    return Promise.all([
      db.models.userProject.create({project_id: project.id, user_id: user01.id}),
      db.models.userProject.create({project_id: project.id, user_id: user02.id}),
    ]);
  });

  afterAll(async () => {
    return Promise.all([
      project.destroy({force: true}),
      user01.destroy({force: true}),
      user02.destroy({force: true}),
    ]);
  });

  describe('GET', () => {
    test('/ - 200 Success', async () => {
      const res = await request
        .get(`/api/project/${project.ident}/user`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2);
      checkProjectUsers(res.body);
    });
  });

  describe('POST', () => {
    test('/ - 200 Success', async () => {
      await request
        .post(`/api/project/${project.ident}/user`)
        .auth(username, password)
        .type('json')
        .send({user: testUser.ident})
        .expect(HTTP_STATUS.CREATED);

      // Check the binding was created
      const result = await db.models.userProject.findOne({
        where: {project_id: project.id, user_id: testUser.id},
      });

      expect(result).not.toBeNull();

      // Remove the just created test user-project binding
      await db.models.userProject.destroy({
        where: {project_id: project.id, user_id: testUser.id},
        force: true,
      });
    });

    test('/ - 404 Not Found - Cannot find provided user', async () => {
      await request
        .post(`/api/project/${project.ident}/user`)
        .auth(username, password)
        .type('json')
        .send({user: uuidv4()})
        .expect(HTTP_STATUS.NOT_FOUND);
    });

    test('/ - 409 Conflict - User is already bound to project', async () => {
      // Create binding
      const binding = await db.models.userProject.create({
        project_id: project.id, user_id: testUser.id,
      });

      await request
        .post(`/api/project/${project.ident}/user`)
        .auth(username, password)
        .type('json')
        .send({user: testUser.ident})
        .expect(HTTP_STATUS.CONFLICT);

      // Remove the just created test user-project binding
      await db.models.userProject.destroy({where: {id: binding.id}, force: true});
    });
  });

  describe('DELETE', () => {
    test('/ - 204 Success', async () => {
      // Create binding
      const binding = await db.models.userProject.create({
        project_id: project.id, user_id: testUser.id,
      });

      await request
        .delete(`/api/project/${project.ident}/user`)
        .auth(username, password)
        .type('json')
        .send({user: testUser.ident})
        .expect(HTTP_STATUS.NO_CONTENT);

      // Verify user-project binding is soft-deleted
      const deletedBinding = await db.models.userProject.findOne({
        where: {id: binding.id},
        paranoid: false,
      });

      expect(deletedBinding.deletedAt).not.toBeNull();

      await deletedBinding.destroy({force: true});
    });

    test('/ - 404 Not Found - Cannot find provided user', async () => {
      await request
        .delete(`/api/project/${project.ident}/user`)
        .auth(username, password)
        .type('json')
        .send({user: uuidv4()})
        .expect(HTTP_STATUS.NOT_FOUND);
    });

    test('/ - 400 Bad Request - User is not bound to project', async () => {
      await request
        .delete(`/api/project/${project.ident}/user`)
        .auth(username, password)
        .type('json')
        .send({user: testUser.ident})
        .expect(HTTP_STATUS.BAD_REQUEST);
    });
  });
});

afterAll(async () => {
  global.gc && global.gc();
  await server.close();
});
