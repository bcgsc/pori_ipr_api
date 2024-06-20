const HTTP_STATUS = require('http-status-codes');
const supertest = require('supertest');
const getPort = require('get-port');
const db = require('../../../app/models');

const CONFIG = require('../../../app/config');
const {listen} = require('../../../app');

CONFIG.set('env', 'test');
const {username, password} = CONFIG.get('testing');

const BASE_URI = '/api/variant-text';

jest.mock('../../../app/middleware/auth.js');

let server;
let request;

const NON_ADMIN_GROUP = 'NON ADMIN GROUP';
const ALL_PROJECTS_ACCESS = 'all projects access';
const VARIANT_EDIT_ACCESS = 'variant-text edit access';

const CREATE_DATA = {
  text: '<p>sample text</p>',
  variantName: 'variant name',
  variantGkbId: 'v_gkb_id',
  cancerType: 'cancer type',
  cancerTypeGkbId: 'ct_gkb_id',
};

const UPLOAD_DATA = {
  text: '<p>sample text</p>',
  variantName: 'variant name',
  variantGkbId: 'v_gkb_id',
  cancerType: 'cancer type',
  cancerTypeGkbId: 'ct_gkb_id',
};

const UPLOAD_DATA_NO_PROJECT = {
  text: '<p>sample text</p>',
  variantName: 'variant name',
  variantGkbId: 'v_gkb_id',
  cancerType: 'cancer type',
  cancerTypeGkbId: 'ct_gkb_id',
};

const UPDATE_DATA = {
  text: '<p>new sample text</p>',
};
const INVALID_UPDATE_DATA = {
  variantName: 'new variant name',
};

const variantTextProperties = [
  'ident', 'createdAt', 'updatedAt', 'project', 'template', 'text',
  'variantName', 'variantGkbId', 'cancerType', 'cancerTypeGkbId',
];

const checkVariantText = (reportObject) => {
  variantTextProperties.forEach((element) => {
    expect(reportObject).toHaveProperty(element);
  });
  expect(reportObject).toEqual(expect.not.objectContaining({
    id: expect.any(Number),
    deletedAt: expect.any(String),
  }));
};

const checkVariantTexts = (reports) => {
  reports.forEach((report) => {
    checkVariantText(report);
  });
};

// Start API
beforeAll(async () => {
  const port = await getPort({port: CONFIG.get('web:port')});
  server = await listen(port);
  request = supertest(server);
});

describe('/variant-text', () => {
  let project;
  let unauthorizedProject;
  let template;
  let variantText;

  beforeAll(async () => {
    // create data to be used in tests
    [project] = await db.models.project.findOrCreate({where: {
      name: 'variant text project',
    }});
    [unauthorizedProject] = await db.models.project.findOrCreate({where: {
      name: 'unauthorized project',
    }});
    [template] = await db.models.template.findOrCreate({where: {
      name: 'variant text template',
    },
    defaults: {
      sections: [],
    }});

    CREATE_DATA.projectId = project.id;
    CREATE_DATA.templateId = template.id;

    UPLOAD_DATA.project = project.ident;
    UPLOAD_DATA.template = template.ident;

    variantText = await db.models.variantText.create(CREATE_DATA);
  });

  // delete reports and projects
  afterAll(async () => {
    // delete newly created data and all of their components
    project.destroy();
    template.destroy();
    unauthorizedProject.destroy();
  });

  describe('GET - /', () => {
    test('/ - 200 Success', async () => {
      const res = await request
        .get(BASE_URI)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      expect(res.body).not.toHaveLength(0);
      checkVariantTexts(res.body);
    });

    test('/ - 200 Get variant text with all project access', async () => {
      const res = await request
        .get(BASE_URI)
        .query({
          groups: [{name: NON_ADMIN_GROUP}, {name: ALL_PROJECTS_ACCESS}],
          projects: [],
        })
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      expect(res.body).not.toHaveLength(0);
      checkVariantTexts(res.body);
    });

    test('/ - 200 Dont get variant text without project access', async () => {
      const res = await request
        .get(BASE_URI)
        .query({
          groups: [{name: NON_ADMIN_GROUP}],
          projects: [{name: unauthorizedProject.name, ident: unauthorizedProject.ident}],
        })
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      expect(res.body).toHaveLength(0);
    });

    test('/ - 200 Get filtered results', async () => {
      const res = await request
        .get(BASE_URI)
        .send({
          variantGkbId: variantText.variantGkbId,
        })
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      expect(res.body).not.toHaveLength(0);
      checkVariantTexts(res.body);
    });

    test('/ - 200 Dont get filtered out results', async () => {
      const res = await request
        .get(BASE_URI)
        .send({
          variantGkbId: 'none',
        })
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      expect(res.body).toHaveLength(0);
    });
  });

  describe('POST - /', () => {
    test('/ - 201 Create successful', async () => {
      const res = await request
        .post(BASE_URI)
        .send(UPLOAD_DATA)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.CREATED);

      checkVariantText(res.body);
    });

    test('/ - 201 Create successful on allowed groups', async () => {
      const res = await request
        .post(BASE_URI)
        .query({
          groups: [{name: VARIANT_EDIT_ACCESS}],
          projects: [{name: project.name, ident: project.ident}],
        })
        .send(UPLOAD_DATA)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.CREATED);

      checkVariantText(res.body);
    });

    test('/ - 403 Create forbidden on not allowed groups', async () => {
      await request
        .post(BASE_URI)
        .query({
          groups: [{name: NON_ADMIN_GROUP}],
          projects: [{name: project.name, ident: project.ident}],
        })
        .send(UPLOAD_DATA)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.FORBIDDEN);
    });
  });

  describe('GET - /:variantText', () => {
    test('/ - 200 Success', async () => {
      const res = await request
        .get(`${BASE_URI}/${variantText.ident}`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      checkVariantText(res.body);
    });

    test('/ - 403 Forbidden user does not have required project', async () => {
      await request
        .get(`${BASE_URI}/${variantText.ident}`)
        .query({
          groups: [{name: NON_ADMIN_GROUP}],
          projects: [{name: unauthorizedProject.name, ident: unauthorizedProject.ident}],
        })
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.FORBIDDEN);
    });
  });

  describe('PUT - /:variantText', () => {
    test('/ - 200 Success', async () => {
      const res = await request
        .put(`${BASE_URI}/${variantText.ident}`)
        .query({
          groups: [{name: VARIANT_EDIT_ACCESS}],
          projects: [{name: project.name, ident: project.ident}],
        })
        .send(UPDATE_DATA)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      checkVariantText(res.body);
      expect(res.body.text).toEqual(UPDATE_DATA.text);
    });

    test('/ - 400 Bad Request not updateable field', async () => {
      await request
        .put(`${BASE_URI}/${variantText.ident}`)
        .send(INVALID_UPDATE_DATA)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.BAD_REQUEST);
    });

    test('/ - 403 Forbidden user group', async () => {
      await request
        .put(`${BASE_URI}/${variantText.ident}`)
        .query({
          groups: [{name: NON_ADMIN_GROUP}],
          projects: [{name: unauthorizedProject.name, ident: unauthorizedProject.ident}],
        })
        .send(UPDATE_DATA)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.FORBIDDEN);
    });
  });

  describe('DELETE - /:variantText', () => {
    let deleteVariantText;

    beforeEach(async () => {
      // Create variant text to be used in delete tests
      deleteVariantText = await db.models.variantText.create(CREATE_DATA);
    });

    afterEach(async () => {
      // delete newly created data and all of their components
      deleteVariantText.destroy({force: true});
    });

    test('/ - 200 Success', async () => {
      await request
        .delete(`${BASE_URI}/${deleteVariantText.ident}`)
        .query({
          groups: [{name: VARIANT_EDIT_ACCESS}],
          projects: [{name: project.name, ident: project.ident}],
        })
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.NO_CONTENT);

      // Verify variant text is soft-deleted
      const deletedVariantText = await db.models.variantText.findOne({
        where: {ident: deleteVariantText.ident},
        paranoid: false,
      });

      expect(deletedVariantText.deletedAt).not.toBeNull();
    });

    test('/ - 403 Forbidden user group', async () => {
      await request
        .delete(`${BASE_URI}/${deleteVariantText.ident}`)
        .query({
          groups: [{name: NON_ADMIN_GROUP}],
          projects: [{name: unauthorizedProject.name, ident: unauthorizedProject.ident}],
        })
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.FORBIDDEN);

      // Verify variant text is soft-deleted
      const deletedVariantText = await db.models.variantText.findOne({
        where: {ident: deleteVariantText.ident},
        paranoid: false,
      });

      expect(deletedVariantText.deletedAt).toBeNull();
    });
  });

  describe('GET - project optional', () => {
    test('/ - 200 Get variant text with project is null', async () => {
      await request
        .get(BASE_URI)
        .send(UPLOAD_DATA_NO_PROJECT)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      const res = await request
        .get(BASE_URI)
        .query({
          groups: [{name: NON_ADMIN_GROUP}, {name: ALL_PROJECTS_ACCESS}],
          projects: [],
        })
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      expect(res.body).not.toHaveLength(0);
      checkVariantTexts(res.body);
    });
  });
});

afterAll(async () => {
  global.gc && global.gc();
  await server.close();
});
