const HTTP_STATUS = require('http-status-codes');
const supertest = require('supertest');
const getPort = require('get-port');
const db = require('../../../app/models');

const CONFIG = require('../../../app/config');
const {listen} = require('../../../app');

CONFIG.set('env', 'test');
const {username, password} = CONFIG.get('testing');

let server;
let request;

const CREATE_DATA = {
  text: '<h3>Title</h3><p>Test text</p>',
};

const UPDATE_DATA = {
  text: '<h2>Updated Title</h2><p>Updated test text</p>',
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
  let body;
  let testAppendix;

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

    body = {
      templateId: template.id,
      projectId: project.id,
    };
  });

  beforeEach(async () => {
    testAppendix = await db.models.templateAppendix.create({
      ...CREATE_DATA,
      templateId: template.id,
      projectId: project.id,
    });
  });

  afterEach(async () => {
    return testAppendix.destroy({force: true});
  });

  describe('GET', () => {
    test('/ - 200 Success', async () => {
      const res = await request
        .get('/api/appendix')
        .auth(username, password)
        .type('json')
        .send(body)
        .expect(HTTP_STATUS.OK);

      expect(res.body).not.toBeNull();
      expect(res.body).toEqual(expect.objectContaining(CREATE_DATA));
    });
  });

  describe('PUT', () => {
    test('/ - 200 Success', async () => {
      const res = await request
        .put('/api/appendix')
        .auth(username, password)
        .type('json')
        .send({...UPDATE_DATA, ...body})
        .expect(HTTP_STATUS.OK);

      expect(res.body).not.toBeNull();
      checkTemplateAppendix(res.body);
      expect(res.body).toEqual(expect.objectContaining(UPDATE_DATA));
    });

    test('/ - 500 Internal Server Error', async () => {
      // First soft-delete record
      await testAppendix.destroy();

      await request
        .put('/api/appendix')
        .send({
          text: '<h3>Updated Title</h3><p>Updated text</p>',
          projectId: 0,
        })
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.INTERNAL_SERVER_ERROR);
    });

    test('/ - 400 Bad Request - Invalid type', async () => {
      await request
        .put('/api/appendix')
        .send({
          text: {
            data: 'TEST DATA',
          },
          projectId: 0,
        })
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.BAD_REQUEST);
    });
  });

  describe('DELETE', () => {
    test('/ - 204 No Content', async () => {
      await request
        .delete('/api/appendix')
        .send(body)
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

    test('/ - 500 Internal Server Error', async () => {
      // First soft-delete record
      await testAppendix.destroy();

      await request
        .delete('/api/appendix')
        .send({projectId: 0})
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
