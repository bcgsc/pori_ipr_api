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
  'ident', 'createdAt', 'updatedAt', 'projectId',
  'userGroupId', 'templateId', 'eventType',
];

const checkPun = (punObject) => {
  punProperties.forEach((element) => {
    expect(punObject).toHaveProperty(element);
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
describe('/notification/project-user-group-notifications', () => {
  let testUser;
  let userGroup1;
  let project;
  let project2;
  let template;
  let userGroup2;
  let pun1;
  let pun2;
  let pun3;

  beforeAll(async () => {
    // get test user
    testUser = await db.models.user.findOne({
      where: {username},
    });

    // Create projects
    project = await db.models.project.create({name: `proj1-${uuidv4()}`});
    project2 = await db.models.project.create({name: `proj2-${uuidv4()}`});

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

    pun1 = await db.models.projectUserGroupNotification.create({
      ident: uuidv4(),
      projectId: project.id,
      userGroupId: userGroup1.id,
      templateId: template.id,
      eventType: 'test event 1',
    });

    pun2 = await db.models.projectUserGroupNotification.create({
      ident: uuidv4(),
      projectId: project.id,
      userGroupId: userGroup2.id,
      templateId: template.id,
      eventType: 'test event 2',
    });

    pun3 = await db.models.projectUserGroupNotification.create({
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
      userGroup1.destroy({force: true}),
      userGroup2.destroy({force: true}),
      project2.destroy({force: true}),
      template.destroy({force: true}),
      pun1.destroy({force: true}),
      pun2.destroy({force: true}),
      pun3.destroy({force: true}),
    ]);
  });

  describe('GET', () => {
    test('/ - project ident - 200 Success', async () => {
      const res = await request
        .get('/api/notification/project-user-group-notifications')
        .auth(username, password)
        .type('json')
        .send({project: project.ident})
        .expect(HTTP_STATUS.OK);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2);
      checkPuns(res.body);
    });

    test('/ - user group ident - 200 Success', async () => {
      const res = await request
        .get('/api/notification/project-user-group-notifications')
        .auth(username, password)
        .type('json')
        .send({user_group: userGroup1.ident})
        .expect(HTTP_STATUS.OK);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2);
      checkPuns(res.body);
    });

    test('/ - project and user group ident - 200 Success', async () => {
      const res = await request
        .get('/api/notification/project-user-group-notifications')
        .auth(username, password)
        .type('json')
        .send({user_group: userGroup1.ident, project: project.ident})
        .expect(HTTP_STATUS.OK);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
      checkPuns(res.body);
    });
  });

  describe('POST', () => {
    test('/ - 200 Success', async () => {
      await request
        .post('/api/notification/project-user-group-notifications')
        .auth(username, password)
        .type('json')
        .send({user_group: userGroup1.ident, project: project.ident, event_type: 'test event 5', template: template.ident})
        .expect(HTTP_STATUS.CREATED);

      // Check the binding was created
      const result = await db.models.projectUserGroupNotification.findOne({
        where: {project_id: project.id, user_group_id: userGroup1.id, event_type: 'test event 5'},
      });

      expect(result).not.toBeNull();

      // Remove the just created test user-project binding
      await db.models.projectUserGroupNotification.destroy({
        where: {id: result.id},
        force: true,
      });
    });

    test('/ - bad project ident- 404 Not Found - Cannot find provided project', async () => {
      await request
        .post('/api/notification/project-user-group-notifications')
        .auth(username, password)
        .type('json')
        .send({user_group: userGroup1.ident, project: uuidv4(), event_type: 'test event 6', template: template.ident})
        .expect(HTTP_STATUS.NOT_FOUND);
    });

    test('/ - bad template ident - 404 Not Found - Cannot find provided project', async () => {
      await request
        .post('/api/notification/project-user-group-notifications')
        .auth(username, password)
        .type('json')
        .send({user_group: userGroup1.ident, project: project.ident, event_type: 'test event 6', template: uuidv4()})
        .expect(HTTP_STATUS.NOT_FOUND);
    });

    test('/ - bad user group ident - 404 Not Found - Cannot find provided user group', async () => {
      await request
        .post('/api/notification/project-user-group-notifications')
        .auth(username, password)
        .type('json')
        .send({user_group: uuidv4(), project: project.ident, event_type: 'test event 7', template: template.ident})
        .expect(HTTP_STATUS.NOT_FOUND);
    });
  });

  describe('DELETE', () => {
    test('/ - 204 Success', async () => {
      // create pun
      const pun = await db.models.projectUserGroupNotification.create({
        ident: uuidv4(),
        projectId: project.id,
        userGroupId: userGroup2.id,
        templateId: template.id,
        eventType: 'test event to delete',
      });
      await request
        .delete('/api/notification/project-user-group-notifications')
        .auth(username, password)
        .type('json')
        .send({ident: String(pun.ident)})
        .expect(HTTP_STATUS.NO_CONTENT);

      // Verify pun is soft-deleted
      const deletedPun = await db.models.projectUserGroupNotification.findOne({
        where: {id: pun.id},
        paranoid: false,
      });

      expect(deletedPun.deletedAt).not.toBeNull();

      await deletedPun.destroy({force: true});
    });

    test('/ - 404 Not Found - Cannot find provided notification', async () => {
      await request
        .delete('/api/notification/project-user-group-notifications')
        .auth(username, password)
        .type('json')
        .send({ident: String(uuidv4())})
        .expect(HTTP_STATUS.NOT_FOUND);
    });
  });
});

afterAll(async () => {
  await server.close();
});
