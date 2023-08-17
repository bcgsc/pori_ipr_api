const getPort = require('get-port');
const supertest = require('supertest');
const HTTP_STATUS = require('http-status-codes');

const db = require('../../../../app/models');
// get test user info
const CONFIG = require('../../../../app/config');
const {listen} = require('../../../../app');

CONFIG.set('env', 'test');
const {username, password} = CONFIG.get('testing');

const ALTERATION_DATA = {
  geneVariant: 'TEST GENE VARIANT',
  germline: true,
};

const ALTERATION_UPDATE_DATA = {
  geneVariant: 'UPDATED GENE VARIANT',
  germline: false,
};

const alterationProperties = [
  'ident', 'createdAt', 'geneVariant', 'germline',
];

const checkAlteration = (alterationObject) => {
  alterationProperties.forEach((element) => {
    expect(alterationObject).toHaveProperty(element);
  });
  expect(alterationObject).toEqual(expect.not.objectContaining({
    id: expect.any(Number),
    reportId: expect.any(Number),
    updatedBy: expect.any(Number),
    deletedAt: expect.any(String),
  }));
};

const checkAlterations = (alterations) => {
  alterations.forEach((alteration) => {
    checkAlteration(alteration);
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

describe('/reports/{report}/summary/genomic-alterations-identified', () => {
  let report;

  beforeAll(async () => {
    // Get genomic template
    const template = await db.models.template.findOne({where: {name: 'genomic'}});
    // Create report
    report = await db.models.report.create({
      templateId: template.id,
      patientId: 'PROBE_TEST_PATIENT',
    });
  });

  afterAll(async () => {
    return report.destroy({force: true});
  });

  describe('GET', () => {
    let getAlteration;

    beforeEach(async () => {
      getAlteration = await db.models.genomicAlterationsIdentified.create({
        ...ALTERATION_DATA, reportId: report.id,
      });
    });

    afterEach(async () => {
      return db.models.genomicAlterationsIdentified.destroy({
        where: {ident: getAlteration.ident},
        force: true,
      });
    });

    test('/ - 200 Success', async () => {
      const res = await request
        .get(`/api/reports/${report.ident}/summary/genomic-alterations-identified`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      checkAlterations(res.body);
    });

    test('/{alteration} - 200 Success', async () => {
      const res = await request
        .get(`/api/reports/${report.ident}/summary/genomic-alterations-identified/${getAlteration.ident}`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      expect(res.body).not.toBeNull();
      checkAlteration(res.body);
    });

    test('/{alteration} - 404 Not Found', async () => {
      // Remove probe test
      await getAlteration.destroy();

      await request
        .get(`/api/reports/${report.ident}/summary/genomic-alterations-identified/${getAlteration.ident}`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.NOT_FOUND);
    });
  });

  describe('POST', () => {
    test('/ - 201 Created', async () => {
      const res = await request
        .post(`/api/reports/${report.ident}/summary/genomic-alterations-identified`)
        .send(ALTERATION_DATA)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.CREATED);

      checkAlteration(res.body);
      expect(res.body).toEqual(expect.objectContaining(ALTERATION_DATA));

      // Check that record was created in the db
      const result = await db.models.genomicAlterationsIdentified.findOne({
        where: {ident: res.body.ident},
      });
      expect(result).not.toBeNull();

      // Delete entry
      await result.destroy({force: true});
    });

    test('/ - 400 Bad Request - Additional Property', async () => {
      await request
        .post(`/api/reports/${report.ident}/summary/genomic-alterations-identified`)
        .send({
          ...ALTERATION_UPDATE_DATA,
          additionalProperty: 'ADDITIONAL_PROPERTY',
        })
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.BAD_REQUEST);
    });

    test('/ - 400 Bad Request - Incorrect field type', async () => {
      await request
        .post(`/api/reports/${report.ident}/summary/genomic-alterations-identified`)
        .send({
          ...ALTERATION_UPDATE_DATA,
          geneVariant: {
            key: 'VALUE',
          },
        })
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.BAD_REQUEST);
    });

    test('/ - 400 Bad Request - Gene variant is required', async () => {
      await request
        .post(`/api/reports/${report.ident}/summary/genomic-alterations-identified`)
        .send({})
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.BAD_REQUEST);
    });
  });

  describe('PUT', () => {
    let putAlteration;

    beforeEach(async () => {
      putAlteration = await db.models.genomicAlterationsIdentified.create({
        ...ALTERATION_DATA, reportId: report.id,
      });
    });

    afterEach(async () => {
      return putAlteration.destroy({force: true});
    });

    test('/{alteration} - 200 Success', async () => {
      const res = await request
        .put(`/api/reports/${report.ident}/summary/genomic-alterations-identified/${putAlteration.ident}`)
        .send(ALTERATION_UPDATE_DATA)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      expect(res.body).not.toBeNull();
      checkAlteration(res.body);
      expect(res.body).toEqual(expect.objectContaining(ALTERATION_UPDATE_DATA));
    });

    test('/{alteration} - 400 Bad Request - Additional Property', async () => {
      await request
        .put(`/api/reports/${report.ident}/summary/genomic-alterations-identified/${putAlteration.ident}`)
        .send({
          ...ALTERATION_UPDATE_DATA,
          additionalProperty: 'ADDITIONAL_PROPERTY',
        })
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.BAD_REQUEST);
    });

    test('/{alteration} - 400 Bad Request - Incorrect field type', async () => {
      await request
        .put(`/api/reports/${report.ident}/summary/genomic-alterations-identified/${putAlteration.ident}`)
        .send({
          ...ALTERATION_UPDATE_DATA,
          geneVariant: {
            key: 'VALUE',
          },
        })
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.BAD_REQUEST);
    });
  });

  describe('DELETE', () => {
    let deleteAlteration;

    beforeEach(async () => {
      deleteAlteration = await db.models.genomicAlterationsIdentified.create({
        ...ALTERATION_DATA, reportId: report.id,
      });
    });

    afterEach(async () => {
      return deleteAlteration.destroy({force: true});
    });

    test('/{alteration} - 204 No Content', async () => {
      await request
        .delete(`/api/reports/${report.ident}/summary/genomic-alterations-identified/${deleteAlteration.ident}`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.NO_CONTENT);

      // get record check that it is soft-deleted
      const result = await db.models.genomicAlterationsIdentified.findOne({
        where: {ident: deleteAlteration.ident},
        paranoid: false,
      });

      expect(result).not.toBeNull();
      expect(result.deletedAt).not.toBeNull();
    });

    test('/{alteration} - 404 Not Found', async () => {
      await deleteAlteration.destroy();

      await request
        .delete(`/api/reports/${report.ident}/summary/genomic-alterations-identified/${deleteAlteration.ident}`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.NOT_FOUND);
    });
  });
});

afterAll(async () => {
  global.gc && global.gc();
  await server.close();
});
