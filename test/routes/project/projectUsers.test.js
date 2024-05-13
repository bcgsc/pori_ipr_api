const getPort = require('get-port');
const supertest = require('supertest');
const {v4: uuidv4} = require('uuid');
const HTTP_STATUS = require('http-status-codes');

const db = require('../../../app/models');
// get test user info
const CONFIG = require('../../../app/config');
const {listen} = require('../../../app');

CONFIG.set('env', 'test');
const {username, managerUsername, bioinformaticianUsername, password} = CONFIG.get('testing');

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
let managerUser;
let managerGroup;
let bioinformaticianUser;
let bioinformaticianGroup;

// Start API
beforeAll(async () => {
  const port = await getPort({port: CONFIG.get('web:port')});
  server = await listen(port);
  request = supertest(server);

  managerUser = await db.models.user.findOne({
    where: {username: managerUsername},
  });
  if (!managerUser) {
    managerUser = await db.models.user.create({
      ident: uuidv4(),
      username: 'ipr-bamboo-manager',
      firstName: 'ipr-bamboo-manager',
      lastName: 'ipr-bamboo-manager',
      email: 'dat@bcgsc.ca',
    });
  }
  managerGroup = await db.models.userGroup.findOne({
    where: {name: 'manager'},
  });
  await db.models.userGroupMember.findOrCreate({
    where: {user_id: managerUser.id, group_id: managerGroup.id},
  });

  bioinformaticianUser = await db.models.user.findOne({
    where: {username: bioinformaticianUsername},
  });
  if (!bioinformaticianUser) {
    bioinformaticianUser = await db.models.user.create({
      ident: uuidv4(),
      username: 'ipr-bamboo-bioinformatician',
      firstName: 'ipr-bamboo-bioinformatician',
      lastName: 'ipr-bamboo-bioinformatician',
      email: 'dat@bcgsc.ca',
    });
  }
  bioinformaticianGroup = await db.models.userGroup.findOne({
    where: {name: 'Bioinformatician'},
  });
  if (!bioinformaticianGroup) {
    bioinformaticianGroup = await db.models.userGroup.create({
      ident: uuidv4(),
      name: 'Bioinformatician',
    });
  }
  await db.models.userGroupMember.findOrCreate({
    where: {user_id: bioinformaticianUser.id, group_id: bioinformaticianGroup.id},
  });
});

// Tests for project user endpoints
describe('/project/:project/user', () => {
  let testUser;
  let project;
  let nonManagerProject;
  let user01;
  let user02;
  let user03;
  let managerProjectBinding;

  beforeAll(async () => {
    // get test user
    testUser = await db.models.user.findOne({
      where: {username},
    });

    // Create project
    project = await db.models.project.create({name: 'user-project-test01'});
    nonManagerProject = await db.models.project.create({name: 'user-project-test02'});
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

    user03 = await db.models.user.create({
      ident: uuidv4(),
      username: uuidv4(),
      firstName: 'userProjectUser03',
      lastName: 'userProjectUser03',
      email: 'userProjectUser03@email.com',
    });

    managerProjectBinding = await db.models.userProject.create({project_id: project.id, user_id: managerUser.id});

    // Bind users to project
    return Promise.all([
      db.models.userProject.create({project_id: project.id, user_id: user01.id}),
      db.models.userProject.create({project_id: project.id, user_id: user02.id}),
    ]);
  });

  afterAll(async () => {
    return Promise.all([
      project.destroy({force: true}),
      nonManagerProject.destroy({force: true}),
      user01.destroy({force: true}),
      user02.destroy({force: true}),
      user03.destroy({force: true}),
      managerProjectBinding.destroy({force: true}),
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
      expect(res.body.length).toBe(3);
      checkProjectUsers(res.body);
    });
  });

  describe('POST', () => {
    // TODO add check that managers can add when they also have the project;
    // TODO check that they can't when they don't;
    // TODO check that bioinf can't
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

    test('/ - 200 Success - by manager', async () => {
      await request
        .post(`/api/project/${project.ident}/user`)
        .auth(managerUsername, password)
        .type('json')
        .send({user: user03.ident})
        .expect(HTTP_STATUS.CREATED);

      // Check the binding was created
      const result = await db.models.userProject.findOne({
        where: {project_id: project.id, user_id: user03.id},
      });

      expect(result).not.toBeNull();

      // Remove the just created test user-project binding
      await db.models.userProject.destroy({
        where: {project_id: project.id, user_id: user03.id},
        force: true,
      });
    });

    test('/ - 403 forbidden to manager who does not have project membership', async () => {
      await request
        .post(`/api/project/${nonManagerProject.ident}/user`)
        .auth(managerUsername, password)
        .type('json')
        .send({user: testUser.ident})
        .expect(HTTP_STATUS.FORBIDDEN);
    });

    test('/ - 403 forbidden to bioinformatician', async () => {
      await request
        .post(`/api/project/${project.ident}/user`)
        .auth(bioinformaticianUsername, password)
        .type('json')
        .send({user: testUser.ident})
        .expect(HTTP_STATUS.FORBIDDEN);
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
    // TODO add check that managers can add when they also have the project;
    // TODO check that they can't when they don't;
    // TODO check that bioinf can't
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

    test('/ - 204 Success by manager with same project membership', async () => {
      // Create binding
      const binding = await db.models.userProject.create({
        project_id: project.id, user_id: testUser.id,
      });
      await request
        .delete(`/api/project/${project.ident}/user`)
        .auth(managerUsername, password)
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

    test('/ - 403 manager can not edit not-owned project', async () => {
      // Create binding
      const binding = await db.models.userProject.create({
        project_id: nonManagerProject.id, user_id: testUser.id,
      });
      await request
        .delete(`/api/project/${nonManagerProject.ident}/user`)
        .auth(managerUsername, password)
        .type('json')
        .send({user: testUser.ident})
        .expect(HTTP_STATUS.FORBIDDEN);

      await binding.destroy({force: true});
    });

    test('/ - 403 bioinformatician can not edit', async () => {
      // Create binding
      await request
        .delete(`/api/project/${project.ident}/user`)
        .auth(bioinformaticianUsername, password)
        .type('json')
        .send({user: testUser.ident})
        .expect(HTTP_STATUS.FORBIDDEN);
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
