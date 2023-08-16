const getPort = require('get-port');
const supertest = require('supertest');
const {v4: uuidv4} = require('uuid');
const HTTP_STATUS = require('http-status-codes');

const db = require('../../../app/models');

const CONFIG = require('../../../app/config');
const {listen} = require('../../../app');

CONFIG.set('env', 'test');
const {username, password} = CONFIG.get('testing');

const punProperties = [
  'ident', 'createdAt', 'updatedAt', 'eventType',
  'user', 'userGroup', 'project', 'template',
];
const punObjectProperties = ['userGroup', 'project', 'template'];
const punUserProperties = [
  'ident', 'username',
];
const punPropertyProperties = [
  'ident', 'name',
];

const checkPun = (punObject) => {
  punProperties.forEach((element) => {
    expect(punObject).toHaveProperty(element);
  });
  punUserProperties.forEach((element) => {
    expect(punObject.user).toHaveProperty(element);
    expect(punObject.user).not.toHaveProperty('id');
  });
  punObjectProperties.forEach((element) => {
    punPropertyProperties.forEach((element2) => {
      expect(punObject[element]).toHaveProperty(element2);
    });
    expect(punObject[element]).not.toHaveProperty('id');
  });
};

const checkPuns = (puns) => {
  puns.forEach((pun) => {
    checkPun(pun);
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
describe('/notification/notifications', () => {
  let testUser;
  let project;
  let project2;
  let template;
  let user01;
  let pun1;
  let pun2;
  let pun3;
  let pun4;
  let pun5;
  let pun6;
  let binding1;
  let binding2;
  let binding3;
  let userGroup1;
  let userGroup2;

  beforeAll(async () => {
    // get test user
    testUser = await db.models.user.findOne({
      where: {username},
    });

    // Create projects
    project = await db.models.project.create({name: `pun-project-1-${uuidv4()}`});
    project2 = await db.models.project.create({name: `pun-project-2-${uuidv4()}`});

    // Create template
    const templateData = {
      name: uuidv4(),
      organization: 'Test Create Org',
      description: 'This is a template used for running tests',
      sections: [
        'microbial',
        'msi',
        'small-mutation',
      ],
    };
    template = await db.models.template.create(templateData);

    // Create users
    const uniqueUsername = uuidv4();
    user01 = await db.models.user.create({
      ident: uuidv4(),
      username: uniqueUsername,
      firstName: `user1_${uniqueUsername}`,
      lastName: `user1_${uniqueUsername}`,
      email: `user1_${uniqueUsername}@email.com`,
    });

    // Bind users to project
    binding1 = await db.models.userProject.create({project_id: project.id, user_id: testUser.id});
    binding2 = await db.models.userProject.create({project_id: project.id, user_id: user01.id});
    binding3 = await db.models.userProject.create({project_id: project2.id, user_id: user01.id});

    // Create userGroups
    userGroup1 = await db.models.userGroup.create({
      ident: uuidv4(),
      name: uuidv4(),
      owner_id: testUser.id,
    });
    userGroup2 = await db.models.userGroup.create({
      ident: uuidv4(),
      name: uuidv4(),
      owner_id: testUser.id,
    });

    pun1 = await db.models.notification.create({
      ident: uuidv4(),
      projectId: project.id,
      userId: testUser.id,
      templateId: template.id,
      eventType: 'test event 1',
    });

    pun2 = await db.models.notification.create({
      ident: uuidv4(),
      projectId: project.id,
      userId: user01.id,
      templateId: template.id,
      eventType: 'test event 2',
    });

    pun3 = await db.models.notification.create({
      ident: uuidv4(),
      projectId: project2.id,
      userId: user01.id,
      templateId: template.id,
      eventType: 'test event 3',
    });

    pun4 = await db.models.notification.create({
      ident: uuidv4(),
      projectId: project.id,
      userGroupId: userGroup1.id,
      templateId: template.id,
      eventType: 'test event 1',
    });

    pun5 = await db.models.notification.create({
      ident: uuidv4(),
      projectId: project.id,
      userGroupId: userGroup2.id,
      templateId: template.id,
      eventType: 'test event 2',
    });

    pun6 = await db.models.notification.create({
      ident: uuidv4(),
      projectId: project2.id,
      userGroupId: userGroup1.id,
      templateId: template.id,
      eventType: 'test event 3',
    });
  });

  afterAll(async () => {
    return Promise.all([
      project.destroy({force: true}),
      user01.destroy({force: true}),
      project2.destroy({force: true}),
      template.destroy({force: true}),
      pun1.destroy({force: true}),
      pun2.destroy({force: true}),
      pun3.destroy({force: true}),
      binding1.destroy({force: true}),
      binding2.destroy({force: true}),
      binding3.destroy({force: true}),
      userGroup1.destroy({force: true}),
      userGroup2.destroy({force: true}),
      pun4.destroy({force: true}),
      pun5.destroy({force: true}),
      pun6.destroy({force: true}),
    ]);
  });

  describe('GET', () => {
    test('/ - project ident - 200 Success', async () => {
      const res = await request
        .get('/api/notification/notifications')
        .auth(username, password)
        .type('json')
        .send({project: project.ident})
        .expect(HTTP_STATUS.OK);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(4);
      checkPuns(res.body);
      res.body.forEach((element) => {
        expect(element.project.ident).toEqual(project.ident);
      });
    });

    test('/ - user group ident - 200 Success', async () => {
      const res = await request
        .get('/api/notification/notifications')
        .auth(username, password)
        .type('json')
        .send({user_group: userGroup1.ident})
        .expect(HTTP_STATUS.OK);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2);
      checkPuns(res.body);
    });

    test('/ - user ident - 200 Success', async () => {
      const res = await request
        .get('/api/notification/notifications')
        .auth(username, password)
        .type('json')
        .send({user: user01.ident})
        .expect(HTTP_STATUS.OK);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2);
      checkPuns(res.body);
    });

    test('/ - project and user ident - 200 Success', async () => {
      const res = await request
        .get('/api/notification/notifications')
        .auth(username, password)
        .type('json')
        .send({user: user01.ident, project: project.ident})
        .expect(HTTP_STATUS.OK);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
      checkPuns(res.body);
    });

    test('/ - project and user group ident - 200 Success', async () => {
      const res = await request
        .get('/api/notification/notifications')
        .auth(username, password)
        .type('json')
        .send({user_group: userGroup1.ident, project: project.ident})
        .expect(HTTP_STATUS.OK);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
      checkPuns(res.body);
    });

    test('/ - user ident - 404 user not found', async () => {
      await request
        .get('/api/notification/notifications')
        .auth(username, password)
        .type('json')
        .send({user: uuidv4()})
        .expect(HTTP_STATUS.NOT_FOUND);
    });

    test('/ - project ident - 404 project not found', async () => {
      await request
        .get('/api/notification/notifications')
        .auth(username, password)
        .type('json')
        .send({project: uuidv4()})
        .expect(HTTP_STATUS.NOT_FOUND);
    });

    test('/ - user group ident - 404 user group not found', async () => {
      await request
        .get('/api/notification/notifications')
        .auth(username, password)
        .type('json')
        .send({user_group: uuidv4()})
        .expect(HTTP_STATUS.NOT_FOUND);
    });
  });

  describe('POST', () => {
    test('/ - 200 Success user', async () => {
      await request
        .post('/api/notification/notifications')
        .auth(username, password)
        .type('json')
        .send({user: testUser.ident, project: project.ident, event_type: 'test event', template: template.ident})
        .expect(HTTP_STATUS.CREATED);

      // Check the notif was created
      const result = await db.models.notification.findOne({
        where: {project_id: project.id, user_id: testUser.id, event_type: 'test event'},
      });

      expect(result).not.toBeNull();

      // Remove the just created test notif
      await db.models.notification.destroy({
        where: {id: result.id},
        force: true,
      });
    });

    test('/ - 200 Success user group', async () => {
      await request
        .post('/api/notification/notifications')
        .auth(username, password)
        .type('json')
        .send({user_group: userGroup1.ident, project: project.ident, event_type: 'test event 5', template: template.ident})
        .expect(HTTP_STATUS.CREATED);

      // Check the binding was created
      const result = await db.models.notification.findOne({
        where: {project_id: project.id, user_group_id: userGroup1.id, event_type: 'test event 5'},
      });

      expect(result).not.toBeNull();

      // Remove the just created test user-project binding
      await db.models.notification.destroy({
        where: {id: result.id},
        force: true,
      });
    });

    test('/ - 404 Not Found - Cannot find provided user', async () => {
      await request
        .post('/api/notification/notifications')
        .auth(username, password)
        .type('json')
        .send({user: uuidv4(), project: project.ident, event_type: 'test event 2', template: template.ident})
        .expect(HTTP_STATUS.NOT_FOUND);
    });

    test('/ - 404 Not Found - Cannot find provided project', async () => {
      await request
        .post('/api/notification/notifications')
        .auth(username, password)
        .type('json')
        .send({user: testUser.ident, project: uuidv4(), event_type: 'test event 2', template: template.ident})
        .expect(HTTP_STATUS.NOT_FOUND);
    });

    test('/ - 404 Not Found - Cannot find provided template', async () => {
      await request
        .post('/api/notification/notifications')
        .auth(username, password)
        .type('json')
        .send({user: testUser.ident, project: project.ident, event_type: 'test event 2', template: uuidv4()})
        .expect(HTTP_STATUS.NOT_FOUND);
    });

    test('/ - bad user group ident - 404 Not Found - Cannot find provided user group', async () => {
      await request
        .post('/api/notification/notifications')
        .auth(username, password)
        .type('json')
        .send({user_group: uuidv4(), project: project.ident, event_type: 'test event 7', template: template.ident})
        .expect(HTTP_STATUS.NOT_FOUND);
    });
  });

  describe('DELETE', () => {
    test('/ - 204 Success', async () => {
      // create pun

      const project3 = await db.models.project.create({name: uuidv4()});
      const pun = await db.models.notification.create({
        ident: uuidv4(),
        projectId: project3.id,
        userId: user01.id,
        templateId: template.id,
        eventType: 'test event to delete',
      });
      // Check the notif was created
      const result = await db.models.notification.findOne({
        where: {ident: pun.ident},
      });

      expect(result).not.toBeNull();
      await request
        .delete('/api/notification/notifications')
        .auth(username, password)
        .type('json')
        .send({ident: String(pun.ident)})
        .expect(HTTP_STATUS.NO_CONTENT);

      // Verify pun is soft-deleted
      const deletedPun = await db.models.notification.findOne({
        where: {ident: pun.ident},
        paranoid: false,
      });

      expect(deletedPun.deletedAt).not.toBeNull();
      await project3.destroy({force: true});
      await deletedPun.destroy({force: true});
    });

    test('/ - 404 Not Found - Cannot find provided notification', async () => {
      await request
        .delete('/api/notification/notifications')
        .auth(username, password)
        .type('json')
        .send({ident: String(uuidv4())})
        .expect(HTTP_STATUS.NOT_FOUND);
    });
  });
});

afterAll(async () => {
  global.gc && global.gc();
  await server.close();
});
