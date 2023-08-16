const HTTP_STATUS = require('http-status-codes');
const supertest = require('supertest');
const getPort = require('get-port');
const {v4: uuidv4} = require('uuid');
const db = require('../../../app/models');

const CONFIG = require('../../../app/config');
const {listen} = require('../../../app');

CONFIG.set('env', 'test');
const {username, password} = CONFIG.get('testing');

// const BASE_URI = '/api/templates';

let server;
let request;

const CREATE_DATA = {
  text: '<h3>Title</h3><p>Test text</p>',
};

const UPDATE_DATA = {
  text: '<h2>Updated Title</h2><p>Updated test text</p>',
};

const NON_EXISTENT_PROJECT_ID = uuidv4();

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

describe('/templates/{template}/appendix', () => {
  let template;

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
  });

  describe('GET', () => {
    let getTestAppendix;

    beforeEach(async () => {
      // create a template to be used in tests
      getTestAppendix = await db.models.templateAppendix.create({
        ...CREATE_DATA,
        templateId: template.id,
      });
    });

    afterEach(async () => {
      return getTestAppendix.destroy({force: true});
    });

    test('/ - 200 Success', async () => {
      const res = await request
        .get(`/api/templates/${template.ident}/appendix`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      expect(res.body).not.toBeNull();
      checkTemplateAppendix(res.body);
      expect(res.body).toEqual(expect.objectContaining(CREATE_DATA));
    });

    test('/ - 404 Not Found', async () => {
      // Soft delete appendix
      await getTestAppendix.destroy();

      await request
        .get(`/api/templates/${template.ident}/appendix`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.NOT_FOUND);
    });
  });

  describe('POST', () => {
    test('/ - 201 Created', async () => {
      const res = await request
        .post(`/api/templates/${template.ident}/appendix`)
        .auth(username, password)
        .type('json')
        .send(CREATE_DATA)
        .expect(HTTP_STATUS.CREATED);

      expect(res.body).not.toBeNull();
      checkTemplateAppendix(res.body);
      expect(res.body).toEqual(expect.objectContaining(CREATE_DATA));

      // Check that record was created in the db
      const result = await db.models.templateAppendix.findOne({where: {ident: res.body.ident}});
      expect(result).not.toBeNull();

      // Delete the created appendix
      await result.destroy({force: true});
    });

    test('/ - 400 Bad Request - Additional properties', async () => {
      await request
        .post(`/api/templates/${template.ident}/appendix`)
        .auth(username, password)
        .type('json')
        .send({
          text: '<h3>Title</h3><p>Text</p>',
          additional: 'ADDITIONAL_PROPERTY',
        })
        .expect(HTTP_STATUS.BAD_REQUEST);
    });

    test('/ - 409 Conflict - Appendix already exists for template', async () => {
      const dupAppendix = await db.models.templateAppendix.create({
        ...CREATE_DATA,
        templateId: template.id,
      });

      await request
        .post(`/api/templates/${template.ident}/appendix`)
        .auth(username, password)
        .type('json')
        .send(CREATE_DATA)
        .expect(HTTP_STATUS.CONFLICT);

      await dupAppendix.destroy({force: true});
    });
  });

  describe('PUT', () => {
    let putTestAppendix;

    beforeEach(async () => {
      putTestAppendix = await db.models.templateAppendix.create({
        ...CREATE_DATA,
        templateId: template.id,
      });
    });

    afterEach(async () => {
      return db.models.templateAppendix.destroy({
        where: {ident: putTestAppendix.ident},
        force: true,
      });
    });

    test('/ - 200 Success', async () => {
      const res = await request
        .put(`/api/templates/${template.ident}/appendix`)
        .auth(username, password)
        .type('json')
        .send(UPDATE_DATA)
        .expect(HTTP_STATUS.OK);

      expect(res.body).not.toBeNull();
      checkTemplateAppendix(res.body);
      expect(res.body).toEqual(expect.objectContaining(UPDATE_DATA));
    });

    test('/ - 404 Not Found', async () => {
      // First soft-delete record
      await putTestAppendix.destroy();

      await request
        .put(`/api/templates/${template.ident}/appendix`)
        .send({
          text: '<h3>Updated Title</h3><p>Updated text</p>',
        })
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.NOT_FOUND);
    });

    test('/ - 400 Bad Request - Invalid type', async () => {
      await request
        .put(`/api/templates/${template.ident}/appendix`)
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
    let deleteTestAppendix;

    beforeEach(async () => {
      deleteTestAppendix = await db.models.templateAppendix.create({
        ...CREATE_DATA,
        templateId: template.id,
      });
    });

    afterEach(async () => {
      return deleteTestAppendix.destroy({force: true});
    });

    test('/ - 204 No Content', async () => {
      await request
        .delete(`/api/templates/${template.ident}/appendix`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.NO_CONTENT);

      // Verify that the record was soft deleted
      const result = await db.models.templateAppendix.findOne({
        where: {id: deleteTestAppendix.id},
        paranoid: false,
      });
      expect(result).not.toBeNull();
      expect(result.deletedAt).not.toBeNull();
    });

    test('/ - 404 Not Found', async () => {
      // First soft-delete record
      await deleteTestAppendix.destroy();

      await request
        .delete(`/api/templates/${template.ident}/appendix`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.NOT_FOUND);
    });
  });

  // delete template
  afterAll(async () => {
    // delete newly created template and all of it's components
    return template.destroy({force: true});
  });
});

describe('/templates/{template}/appendix with project_id', () => {
  let template;
  let project;

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

    // Create project
    project = await db.models.project.create({name: 'test-appendix-project'});
  });

  describe('GET', () => {
    let getTestAppendix;

    beforeEach(async () => {
      // create a template to be used in tests
      getTestAppendix = await db.models.templateAppendix.create({
        ...CREATE_DATA,
        templateId: template.id,
        projectId: project.id,
      });
    });

    afterEach(async () => {
      return getTestAppendix.destroy({force: true});
    });

    test('/ - 200 Success', async () => {
      const res = await request
        .get(`/api/templates/${template.ident}/appendix`)
        .send({projectId: project.ident})
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      expect(res.body).not.toBeNull();
      checkTemplateAppendix(res.body);
      expect(res.body).toEqual(expect.objectContaining(CREATE_DATA));
    });

    test('/ - 404 Not Found', async () => {
      // Send a not existent project uuid
      await request
        .get(`/api/templates/${template.ident}/appendix`)
        .send({NON_EXISTENT_PROJECT_ID})
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.NOT_FOUND);
    });
  });

  describe('POST', () => {
    test('/ - 201 Created', async () => {
      const res = await request
        .post(`/api/templates/${template.ident}/appendix`)
        .send({projectId: project.ident})
        .auth(username, password)
        .type('json')
        .send(CREATE_DATA)
        .expect(HTTP_STATUS.CREATED);

      expect(res.body).not.toBeNull();
      checkTemplateAppendix(res.body);
      expect(res.body).toEqual(expect.objectContaining(CREATE_DATA));

      // Check that record was created in the db
      const result = await db.models.templateAppendix.findOne({where: {ident: res.body.ident}});
      expect(result).not.toBeNull();

      // Delete the created appendix
      await result.destroy({force: true});
    });

    test('/ - 409 Conflict - Appendix already exists for project', async () => {
      const dupAppendix = await db.models.templateAppendix.create({
        ...CREATE_DATA,
        templateId: template.id,
        projectId: project.id,
      });

      await request
        .post(`/api/templates/${template.ident}/appendix`)
        .send({projectId: project.ident})
        .auth(username, password)
        .type('json')
        .send(CREATE_DATA)
        .expect(HTTP_STATUS.CONFLICT);

      await dupAppendix.destroy({force: true});
    });
  });

  describe('PUT', () => {
    let putTestAppendix;

    beforeEach(async () => {
      putTestAppendix = await db.models.templateAppendix.create({
        ...CREATE_DATA,
        templateId: template.id,
        projectId: project.id,
      });
    });

    afterEach(async () => {
      return db.models.templateAppendix.destroy({
        where: {ident: putTestAppendix.ident},
        force: true,
      });
    });

    test('/ - 200 Success', async () => {
      const res = await request
        .put(`/api/templates/${template.ident}/appendix`)
        .auth(username, password)
        .type('json')
        .send({...UPDATE_DATA, projectId: project.ident})
        .expect(HTTP_STATUS.OK);

      expect(res.body).not.toBeNull();
      checkTemplateAppendix(res.body);
      expect(res.body).toEqual(expect.objectContaining(UPDATE_DATA));
    });

    test('/ - 404 Not Found', async () => {
      // First soft-delete record
      await putTestAppendix.destroy();

      await request
        .put(`/api/templates/${template.ident}/appendix`)
        .send({
          text: '<h3>Updated Title</h3><p>Updated text</p>',
          NON_EXISTENT_PROJECT_ID,
        })
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.NOT_FOUND);
    });

    test('/ - 400 Bad Request - Invalid type', async () => {
      await request
        .put(`/api/templates/${template.ident}/appendix`)
        .send({
          text: {
            data: 'TEST DATA',
          },
          projectId: project.ident,
        })
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.BAD_REQUEST);
    });
  });

  describe('DELETE', () => {
    let deleteTestAppendix;

    beforeEach(async () => {
      deleteTestAppendix = await db.models.templateAppendix.create({
        ...CREATE_DATA,
        templateId: template.id,
        projectId: project.id,
      });
    });

    afterEach(async () => {
      return deleteTestAppendix.destroy({force: true});
    });

    test('/ - 204 No Content', async () => {
      await request
        .delete(`/api/templates/${template.ident}/appendix`)
        .send({projectId: project.ident})
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.NO_CONTENT);

      // Verify that the record was soft deleted
      const result = await db.models.templateAppendix.findOne({
        where: {id: deleteTestAppendix.id},
        paranoid: false,
      });
      expect(result).not.toBeNull();
      expect(result.deletedAt).not.toBeNull();
    });

    test('/ - 404 Not Found', async () => {
      // First soft-delete record
      await deleteTestAppendix.destroy();

      await request
        .delete(`/api/templates/${template.ident}/appendix`)
        .send({NON_EXISTENT_PROJECT_ID})
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.NOT_FOUND);
    });
  });

  // delete template
  afterAll(async () => {
    // delete newly created template and project
    await template.destroy({force: true});
    return project.destroy({force: true});
  });
});

afterAll(async () => {
  global.gc && global.gc();
  await server.close();
});
