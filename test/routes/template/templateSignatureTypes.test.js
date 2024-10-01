const HTTP_STATUS = require('http-status-codes');
const supertest = require('supertest');
const getPort = require('get-port');
const db = require('../../../app/models');

const CONFIG = require('../../../app/config');
const {listen} = require('../../../app');

CONFIG.set('env', 'test');
const {username, bioinformaticianUsername, password} = CONFIG.get('testing');

let server;
let request;

const CREATE_DATA = {
  signatureType: 'reviewer',
};

const UPDATE_DATA = {
  signatureType: 'reviewerupdate',
};

const templateSignatureProperties = [
  'ident', 'createdAt', 'updatedAt', 'signatureType',
];

const checkTemplateSignatureTypes = (signatureObject) => {
  templateSignatureProperties.forEach((element) => {
    expect(signatureObject).toHaveProperty(element);
  });
  expect(signatureObject).toEqual(expect.not.objectContaining({
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

describe('/templates/{template}/signature-types', () => {
  let template;

  beforeAll(async () => {
    // create a template to be used in tests
    template = await db.models.template.create({
      name: 'Test Signature Template',
      organization: 'Test Org',
      sections: [
        'microbial',
        'msi',
        'small-mutation',
      ],
    });
  });

  describe('GET', () => {
    let getTestSignatureType;

    beforeEach(async () => {
      // create a template to be used in tests
      getTestSignatureType = await db.models.templateSignatureTypes.create({
        ...CREATE_DATA,
        templateId: template.id,
      });
    });

    afterEach(async () => {
      return getTestSignatureType.destroy({force: true});
    });

    test('/ - 200 Success', async () => {
      const res = await request
        .get(`/api/templates/${template.ident}/signature-types`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      expect(res.body).not.toBeNull();
      checkTemplateSignatureTypes(res.body);
      expect(res.body).toEqual(expect.objectContaining(CREATE_DATA));
    });

    test('/ - 404 Not Found', async () => {
      // Soft delete signature types
      await getTestSignatureType.destroy();

      await request
        .get(`/api/templates/${template.ident}/signature-types`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.NOT_FOUND);
    });
  });

  describe('POST', () => {
    test('/ - 201 Created', async () => {
      const res = await request
        .post(`/api/templates/${template.ident}/signature-types`)
        .auth(username, password)
        .type('json')
        .send(CREATE_DATA)
        .expect(HTTP_STATUS.CREATED);

      expect(res.body).not.toBeNull();
      checkTemplateSignatureTypes(res.body);
      expect(res.body).toEqual(expect.objectContaining(CREATE_DATA));

      // Check that record was created in the db
      const result = await db.models.templateSignatureTypes.findOne({where: {ident: res.body.ident}});
      expect(result).not.toBeNull();

      // Delete the created signature type
      await result.destroy({force: true});
    });

    test('/ - 403 forbidden to bioinformatician', async () => {
      await request
        .post(`/api/templates/${template.ident}/signature-types`)
        .auth(bioinformaticianUsername, password)
        .type('json')
        .send(CREATE_DATA)
        .expect(HTTP_STATUS.FORBIDDEN);
    });

    test('/ - 400 Bad Request - Additional properties', async () => {
      await request
        .post(`/api/templates/${template.ident}/signature-types`)
        .auth(username, password)
        .type('json')
        .send({
          signatureType: 'reviewer',
          additional: 'ADDITIONAL_PROPERTY',
        })
        .expect(HTTP_STATUS.BAD_REQUEST);
    });

    test('/ - 409 Conflict - Signature type already exists for template', async () => {
      const dupSignature = await db.models.templateSignatureTypes.create({
        ...CREATE_DATA,
        templateId: template.id,
      });

      await request
        .post(`/api/templates/${template.ident}/signature-types`)
        .auth(username, password)
        .type('json')
        .send(CREATE_DATA)
        .expect(HTTP_STATUS.CONFLICT);

      await dupSignature.destroy({force: true});
    });
  });

  describe('PUT', () => {
    let putTest;

    beforeEach(async () => {
      putTest = await db.models.templateSignatureTypes.create({
        ...CREATE_DATA,
        templateId: template.id,
      });
    });

    afterEach(async () => {
      await db.models.templateSignatureTypes.destroy({
        where: {ident: putTest.ident},
        force: true,
      });
    });

    test('/ - 200 Success', async () => {
      const res = await request
        .put(`/api/templates/${template.ident}/signature-types`)
        .auth(username, password)
        .type('json')
        .send(UPDATE_DATA)
        .expect(HTTP_STATUS.OK);

      expect(res.body).not.toBeNull();
      checkTemplateSignatureTypes(res.body);
      expect(res.body).toEqual(expect.objectContaining(UPDATE_DATA));
    });

    test('/ - 403 forbidden to bioinformatician', async () => {
      await request
        .put(`/api/templates/${template.ident}/signature-types`)
        .auth(bioinformaticianUsername, password)
        .type('json')
        .send(UPDATE_DATA)
        .expect(HTTP_STATUS.FORBIDDEN);
    });

    test('/ - 404 Not Found', async () => {
      // First soft-delete record
      await putTest.destroy();

      await request
        .put(`/api/templates/${template.ident}/signature-types`)
        .send({
          signatureType: 'reviewer',
        })
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.NOT_FOUND);
    });

    test('/ - 400 Bad Request - Invalid type', async () => {
      await request
        .put(`/api/templates/${template.ident}/signature-types`)
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
    let deleteTest;

    beforeEach(async () => {
      deleteTest = await db.models.templateSignatureTypes.create({
        ...CREATE_DATA,
        templateId: template.id,
      });
    });

    afterEach(async () => {
      await deleteTest.destroy({force: true});
    });

    test('/ - 204 No Content', async () => {
      await request
        .delete(`/api/templates/${template.ident}/signature-types`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.NO_CONTENT);

      // Verify that the record was soft deleted
      const result = await db.models.templateSignatureTypes.findOne({
        where: {id: deleteTest.id},
        paranoid: false,
      });
      expect(result).not.toBeNull();
      expect(result.deletedAt).not.toBeNull();
    });

    test('/ - 403 forbidden to bioinformatician', async () => {
      await request
        .delete(`/api/templates/${template.ident}/signature-types`)
        .auth(bioinformaticianUsername, password)
        .type('json')
        .expect(HTTP_STATUS.FORBIDDEN);
    });

    test('/ - 404 Not Found', async () => {
      // First soft-delete record
      await deleteTest.destroy();

      await request
        .delete(`/api/templates/${template.ident}/signature-types`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.NOT_FOUND);
    });
  });

  // delete template
  afterAll(async () => {
    await template.destroy({force: true});
  });
});

afterAll(async () => {
  global.gc && global.gc();
  await server.close();
});
