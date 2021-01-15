const HTTP_STATUS = require('http-status-codes');
const supertest = require('supertest');
const getPort = require('get-port');
const {Op} = require('sequelize');
const db = require('../../app/models');

const CONFIG = require('../../app/config');
const {listen} = require('../../app');

CONFIG.set('env', 'test');
const {username, password} = CONFIG.get('testing');

const BASE_URI = '/api/templates';

let server;
let request;

const CREATE_DATA = {
  name: 'Test Create Template',
  organization: 'Test Create Org',
  sections: [
    'microbial',
    'msi',
    'small-mutation',
  ],
};

const UPLOAD_DATA = {
  name: 'Test Upload Template',
  organization: 'Test Upload Org',
  sections: [
    'therapeutic-targets',
    'structural-variants',
  ],
};

const UPDATE_DATA = {
  name: 'Test Update Template',
  organization: 'Test Update Org',
  sections: [
    'microbial',
    'structural-variants',
  ],
};

const DELETE_DATA = {
  name: 'Test Delete Template',
  organization: 'Test Delete Org',
  sections: [
    'therapeutic-targets',
    'structural-variants',
  ],
};

const templateProperties = [
  'ident', 'createdAt', 'updatedAt', 'name', 'organization',
  'sections', 'logoImage', 'headerImage',
];

const checkTemplate = (reportObject) => {
  templateProperties.forEach((element) => {
    expect(reportObject).toHaveProperty(element);
  });
  expect(reportObject).toEqual(expect.not.objectContaining({
    id: expect.any(Number),
    logoId: expect.any(Number),
    headerId: expect.any(Number),
    deletedAt: expect.any(String),
  }));
};

const checkTemplates = (templates) => {
  templates.forEach((template) => {
    checkTemplate(template);
  });
};

// Start API
beforeAll(async () => {
  const port = await getPort({port: CONFIG.get('web:port')});
  server = await listen(port);
  request = supertest(server);
});

describe('/templates', () => {
  let template;

  beforeAll(async () => {
    // create a template to be used in tests
    template = await db.models.template.create(CREATE_DATA);
  });

  describe('GET', () => {
    test('/ - 200 Success', async () => {
      const res = await request
        .get(BASE_URI)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      expect(Array.isArray(res.body)).toBe(true);
      checkTemplates(res.body);
    });

    test('/ - template name query - 200 success', async () => {
      const res = await request
        .get(BASE_URI)
        .query({name: 'Template'})
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      checkTemplates(res.body);
      expect(res.body).toEqual(expect.arrayContaining([
        expect.objectContaining({name: expect.stringContaining('Template')}),
      ]));
    });

    test('/ - organization query - 200 success', async () => {
      const res = await request
        .get(BASE_URI)
        .query({organization: 'test'})
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      checkTemplates(res.body);
      expect(res.body).toEqual(expect.arrayContaining([
        expect.objectContaining({organization: expect.stringContaining('Test')}),
      ]));
    });

    test('/{template} - 200 Success', async () => {
      const res = await request
        .get(`${BASE_URI}/${template.ident}`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      checkTemplate(res.body);
      expect(res.body).toEqual(expect.objectContaining(CREATE_DATA));
    });
  });

  describe('POST', () => {
    test('/ - 201 Created', async () => {
      const newImages = [];
      const res = await request
        .post(BASE_URI)
        .attach('logo', 'test/testData/images/golden.jpg')
        .attach('header', 'test/testData/images/golden.jpg')
        .field('name', 'Test Upload Template')
        .field('organization', 'Test Upload Org')
        .field('sections', 'therapeutic-targets')
        .field('sections', 'structural-variants')
        .auth(username, password)
        .expect(HTTP_STATUS.CREATED);

      checkTemplate(res.body);
      expect(res.body).toEqual(expect.objectContaining(UPLOAD_DATA));

      expect(res.body.logoImage.ident).not.toBeNull();
      newImages.push(res.body.logoImage.ident);
      expect(res.body.headerImage.ident).not.toBeNull();
      newImages.push(res.body.headerImage.ident);

      // Check that record was created in the db
      const result = await db.models.template.findOne({where: {ident: res.body.ident}});
      expect(result).not.toBeNull();

      // Delete template and images
      await db.models.image.destroy({where: {ident: {[Op.in]: newImages}}, force: true});
      await db.models.template.destroy({where: {ident: res.body.ident}, force: true});
    });

    test('/ - name is required - 400 Bad Request', async () => {
      const {name, ...data} = UPLOAD_DATA;
      await request
        .post(BASE_URI)
        .auth(username, password)
        .type('json')
        .send(data)
        .expect(HTTP_STATUS.BAD_REQUEST);
    });

    test('/ - sections are required - 400 Bad Request', async () => {
      const {sections, ...data} = UPLOAD_DATA;
      await request
        .post(BASE_URI)
        .auth(username, password)
        .type('json')
        .send(data)
        .expect(HTTP_STATUS.BAD_REQUEST);
    });

    test('/ - name is already taken - 409 Conflict', async () => {
      await request
        .post(BASE_URI)
        .auth(username, password)
        .type('json')
        .send(CREATE_DATA)
        .expect(HTTP_STATUS.CONFLICT);
    });
  });

  describe('PUT', () => {
    let templateUpdate;

    beforeEach(async () => {
      templateUpdate = await db.models.template.create(UPDATE_DATA);
    });

    afterEach(async () => {
      await db.models.template.destroy({where: {ident: templateUpdate.ident}, force: true});
    });

    test('/{template} - 200 Success', async () => {
      const newImages = [];
      const res = await request
        .put(`${BASE_URI}/${templateUpdate.ident}`)
        .attach('logo', 'test/testData/images/golden.jpg')
        .attach('header', 'test/testData/images/golden.jpg')
        .field('name', 'New Name')
        .field('organization', 'New Orgs')
        .field('sections', 'therapeutic-targets')
        .field('sections', 'genes')
        .auth(username, password)
        .expect(HTTP_STATUS.OK);

      checkTemplate(res.body);
      expect(res.body).toEqual(expect.objectContaining({
        name: 'New Name',
        organization: 'New Orgs',
        sections: ['therapeutic-targets', 'genes'],
        logoImage: expect.any(Object),
        headerImage: expect.any(Object),
      }));

      expect(res.body.logoImage.ident).not.toBeNull();
      newImages.push(res.body.logoImage.ident);
      expect(res.body.headerImage.ident).not.toBeNull();
      newImages.push(res.body.headerImage.ident);

      // Delete template and images
      await db.models.image.destroy({where: {ident: {[Op.in]: newImages}}, force: true});
    });

    test('/{template} - 400 Bad Request Failed Validation', async () => {
      await request
        .put(`${BASE_URI}/${templateUpdate.ident}`)
        .send({...UPDATE_DATA, id: 6})
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.BAD_REQUEST);
    });

    test('/{template} - 404 Not Found no template data to update', async () => {
      // First soft-delete record
      await db.models.template.destroy({where: {ident: templateUpdate.ident}});

      await request
        .put(`${BASE_URI}/${templateUpdate.ident}`)
        .send(UPDATE_DATA)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.NOT_FOUND);
    });
  });

  describe('DELETE', () => {
    let templateDelete;

    beforeEach(async () => {
      templateDelete = await db.models.template.create(DELETE_DATA);
    });

    afterEach(async () => {
      await db.models.template.destroy({
        where: {ident: templateDelete.ident}, force: true,
      });
    });

    test('/{template} - 204 No content', async () => {
      await request
        .delete(`${BASE_URI}/${templateDelete.ident}`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.NO_CONTENT);

      // Verify that the record was deleted
      const result = await db.models.template.findOne({where: {id: templateDelete.id}});
      expect(result).toBeNull();
    });

    test('/{template} - 404 Not Found no template to delete', async () => {
      // First soft-delete record
      await db.models.template.destroy({where: {ident: templateDelete.ident}});

      await request
        .delete(`${BASE_URI}/${templateDelete.ident}`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.NOT_FOUND);
    });
  });

  // delete template
  afterAll(async () => {
    // delete newly created template and all of it's components
    await db.models.template.destroy({where: {ident: template.ident}, force: true});

    // verify template is deleted
    const result = await db.models.template.findOne({where: {ident: template.ident}, paranoid: false});
    expect(result).toBeNull();
  });
});

afterAll(async () => {
  await server.close();
});
