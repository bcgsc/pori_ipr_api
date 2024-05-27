const HTTP_STATUS = require('http-status-codes');
const supertest = require('supertest');
const getPort = require('get-port');
const {v4: uuidv4} = require('uuid');
const db = require('../../../app/models');

const CONFIG = require('../../../app/config');
const {listen} = require('../../../app');

CONFIG.set('env', 'test');
const {username, managerUsername, bioinformaticianUsername, password} = CONFIG.get('testing');

const NON_EXISTENT_PROJECT_ID = uuidv4();

let server;
let request;

const CREATE_DATA = {
  text: '<h3>Title</h3><p>Test text</p>',
};

const CREATE_DATA2 = {
  text: '<h3>Title2</h3><p>Test text</p>',
};

const UPDATE_DATA = {
  text: '<h2>Updated Title</h2><p>Updated test text</p>',
};

const UPDATE_DATA2 = {
  text: '<h2>Updated 2 Title</h2><p>Updated test text</p>',
};

const templateAppendixProperties = [
  'ident', 'createdAt', 'updatedAt', 'text',
];

const checkTemplateAppendix = (appendixObject) => {
  templateAppendixProperties.forEach((element) => {
    expect(appendixObject).toHaveProperty(element);
  });
  expect(appendixObject).toEqual(expect.not.objectContaining({
    id: expect.any(Number),
    templateId: expect.any(Number),
    updatedBy: expect.any(Number),
    deletedAt: expect.any(String),
  }));
};

// Start API
beforeAll(async () => {
  const port = await getPort({port: CONFIG.get('web:port')});
  server = await listen(port);
  request = supertest(server);
});

describe('/appendix', () => {
  let template;
  let project;
  let nonManagerProject;
  let testAppendix;
  let testAppendix2;
  let managerUser;

  beforeAll(async () => {
    // create a template to be used in tests
    template = await db.models.template.create({
      name: 'Test Template',
      organization: 'Test Org',
      sections: [
        'microbial',
        'msi',
        'small-mutation',
      ],
    });

    // Create projects
    project = await db.models.project.create({name: 'test-appendix-project'});
    nonManagerProject = await db.models.project.create({name: 'test-appendix-nonManagerProject'});

    // create the manage-user/project binding
    managerUser = await db.models.user.findOne({where: {username: managerUsername}});
    await db.models.userProject.create({project_id: project.id, user_id: managerUser.id});
  });

  beforeEach(async () => {
    testAppendix = await db.models.templateAppendix.create({
      ...CREATE_DATA,
      templateId: template.id,
      projectId: project.id,
    });

    testAppendix2 = await db.models.templateAppendix.create({
      ...CREATE_DATA2,
      templateId: template.id,
      projectId: nonManagerProject.id,
    });
  });

  afterEach(async () => {
    await testAppendix.destroy({force: true});
    await testAppendix2.destroy({force: true});
  });

  describe('GET', () => {
    test('/ - 200 Success with project/template combo', async () => {
      template1 = await db.models.template.create({
        name: 'Test Template1',
        organization: 'Test Org',
        sections: ['microbial']});

      const res = await request
        .get(`/api/appendix?templateId=${template1.ident}&projectId=${project.ident}`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      expect(res.body).not.toBeNull();
      expect(res.body).toEqual(expect.objectContaining(CREATE_DATA));
    });
  });

  describe('POST', () => {
    test('/ - 200 Success with project/template combo', async () => {
      template1 = await db.models.template.create({
        name: 'Test Template1',
        organization: 'Test Org',
        sections: ['microbial']});

      const res = await request
        .post(`/api/appendix?templateId=${template1.ident}&projectId=${project.ident}`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.CREATED);

      expect(res.body).not.toBeNull();
      await template1.destroy({force: true});
      await db.models.templateAppendix.destroy({where: {ident: res.body.ident}, force: true});
    });

    test('/ - 200 Success with null-project/template combo', async () => {
      template2 = await db.models.template.create({
        name: 'Test Template2',
        organization: 'Test Org',
        sections: ['microbial']});

      const res = await request
        .post(`/api/appendix?templateId=${template2.ident}`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.CREATED);

      expect(res.body).not.toBeNull();
      await template2.destroy({force: true});
      await db.models.templateAppendix.destroy({where: {ident: res.body.ident}, force: true});
    });

    test('/ - 200 Success - by manager', async () => {
      const res = await request
        .post(`/api/appendix?templateId=${template.ident}&projectId=${project.ident}`)
        .auth(managerUsername, password)
        .type('json')
        .send({...UPDATE_DATA2})
        .expect(HTTP_STATUS.CREATED);

      expect(res.body).not.toBeNull();
      checkTemplateAppendix(res.body);
    });

    test('/ - 400 bad request due to non-unique project/template combo', async () => {
      template2 = await db.models.template.create({
        name: 'Test Template24',
        organization: 'Test Org',
        sections: ['microbial']});

        const res = await request
        .post(`/api/appendix?templateId=${template1.ident}&projectId=${project.ident}`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.CREATED);

      expect(res.body).not.toBeNull();

      await request
        .post(`/api/appendix?templateId=${template1.ident}&projectId=${project.ident}`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.BAD_REQUEST);

      await template2.destroy({force: true});
      await db.models.templateAppendix.destroy({where: {ident: res.body.ident}, force: true});
    });

    test('/ - 400 bad request due to non-unique default template text', async () => {
      template2 = await db.models.template.create({
        name: 'Test Template3',
        organization: 'Test Org',
        sections: ['microbial']});

      const res = await request
        .post(`/api/appendix?templateId=${template2.ident}`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.CREATED);

      expect(res.body).not.toBeNull();

      await request
        .post(`/api/appendix?templateId=${template2.ident}`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.BAD_REQUEST);

      await template2.destroy({force: true});
      await db.models.templateAppendix.destroy({where: {ident: res.body.ident}, force: true});
    });
  });

  describe('PUT', () => {
    test('/ - 200 Success', async () => {
      const res = await request
        .put(`/api/appendix?templateId=${template.ident}&projectId=${project.ident}`)
        .auth(username, password)
        .type('json')
        .send({...UPDATE_DATA})
        .expect(HTTP_STATUS.OK);

      expect(res.body).not.toBeNull();
      checkTemplateAppendix(res.body);
      expect(res.body).toEqual(expect.objectContaining(UPDATE_DATA));
    });

    test('/ - 200 Success - by manager', async () => {
      const res = await request
        .put(`/api/appendix?templateId=${template.ident}&projectId=${project.ident}`)
        .auth(managerUsername, password)
        .type('json')
        .send({...UPDATE_DATA2})
        .expect(HTTP_STATUS.OK);

      expect(res.body).not.toBeNull();
      checkTemplateAppendix(res.body);
      expect(res.body).toEqual(expect.objectContaining(UPDATE_DATA2));
    });

    test('/ - 403 forbidden to manager without project membership', async () => {
      await request
        .put(`/api/appendix?templateId=${template.ident}&projectId=${nonManagerProject.ident}`)
        .auth(managerUsername, password)
        .type('json')
        .send({...UPDATE_DATA2})
        .expect(HTTP_STATUS.FORBIDDEN);
    });

    test('/ - 403 forbidden to bioinformatician', async () => {
      await request
        .put(`/api/appendix?templateId=${template.ident}&projectId=${project.ident}`)
        .auth(bioinformaticianUsername, password)
        .type('json')
        .send({...UPDATE_DATA2})
        .expect(HTTP_STATUS.FORBIDDEN);
    });

    test('/ - 500 Internal Server Error', async () => {
      // First soft-delete record
      await testAppendix.destroy();

      await request
        .put(`/api/appendix?templateId=${template.ident}&projectId=${NON_EXISTENT_PROJECT_ID}`)
        .send({
          text: '<h3>Updated Title</h3><p>Updated text</p>',
        })
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.INTERNAL_SERVER_ERROR);
    });

    test('/ - 400 Bad Request - Invalid type', async () => {
      await request
        .put(`/api/appendix?templateId=${template.ident}&projectId=${project.ident}`)
        .send({
          text: {
            data: 'TEST DATA',
          },
        })
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.BAD_REQUEST);
    });
  });

  describe('DELETE', () => {
    test('/ - 204 No Content', async () => {
      await request
        .delete(`/api/appendix?templateId=${template.ident}&projectId=${project.ident}`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.NO_CONTENT);

      // Verify that the record was soft deleted
      const result = await db.models.templateAppendix.findOne({
        where: {id: testAppendix.id},
        paranoid: false,
      });
      expect(result).not.toBeNull();
      expect(result.deletedAt).not.toBeNull();
    });

    test('/ - 204 No Content by manager', async () => {
      await request
        .delete(`/api/appendix?templateId=${template.ident}&projectId=${project.ident}`)
        .auth(managerUsername, password)
        .type('json')
        .expect(HTTP_STATUS.NO_CONTENT);

      // Verify that the record was soft deleted
      const result = await db.models.templateAppendix.findOne({
        where: {id: testAppendix.id},
        paranoid: false,
      });
      expect(result).not.toBeNull();
      expect(result.deletedAt).not.toBeNull();
    });

    test('/ - 403 forbidden when manager does not have project membership', async () => {
      await request
        .delete(`/api/appendix?templateId=${template.ident}&projectId=${nonManagerProject.ident}`)
        .auth(managerUsername, password)
        .type('json')
        .expect(HTTP_STATUS.FORBIDDEN);
    });

    test('/ - 403 forbidden to bioinformatician', async () => {
      await request
        .delete(`/api/appendix?templateId=${template.ident}&projectId=${project.ident}`)
        .auth(bioinformaticianUsername, password)
        .type('json')
        .expect(HTTP_STATUS.FORBIDDEN);
    });

    test('/ - 500 Internal Server Error', async () => {
      // First soft-delete record
      await testAppendix.destroy();

      await request
        .delete(`/api/appendix?projectId=${NON_EXISTENT_PROJECT_ID}`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.INTERNAL_SERVER_ERROR);
    });
  });

  // delete template
  afterAll(async () => {
    // delete newly created template and all of it's components
    await template.destroy({force: true});
    return project.destroy({force: true});
  });
});

afterAll(async () => {
  global.gc && global.gc();
  await server.close();
});
