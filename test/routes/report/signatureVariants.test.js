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
  displayName: 'display name',
  signatureName: 'signature name',
  variantTypeName: 'variant type name',
};
const UPDATE_DATA = {
  displayName: 'New display name',
  signatureName: 'New signature name',
  variantTypeName: 'New variant type name',
};

const sigvProperties = [
  'ident', 'createdAt', 'updatedAt', 'displayName', 'signatureName', 'variantTypeName',
];

const checkSigv = (sigvObject) => {
  sigvProperties.forEach((element) => {
    expect(sigvObject).toHaveProperty(element);
  });
  expect(sigvObject).toEqual(expect.not.objectContaining({
    id: expect.any(Number),
    reportId: expect.any(Number),
    deletedAt: expect.any(String),
  }));
};

// Start API
beforeAll(async () => {
  const port = await getPort({port: CONFIG.get('web:port')});
  server = await listen(port);
  request = supertest(server);
});

describe('/reports/{REPORTID}/sigv', () => {
  let report;
  let sigv;

  beforeAll(async () => {
    // Get genomic template
    const template = await db.models.template.findOne({where: {name: 'genomic'}});
    // create a report to be used in tests
    report = await db.models.report.create({
      templateId: template.id,
      patientId: 'PATIENT1234',
    });

    // Create initial sigv data
    sigv = await db.models.signatureVariants.create({...CREATE_DATA, reportId: report.id});
  });

  describe('GET', () => {
    test('/ - 200 Success', async () => {
      const res = await request
        .get(`/api/reports/${report.ident}/signature-variants`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);

      const [entry] = res.body;

      checkSigv(entry);

      expect(entry).toEqual(expect.objectContaining(CREATE_DATA));
    });

    test('/{sigv} - 200 Success', async () => {
      const res = await request
        .get(`/api/reports/${report.ident}/signature-variants/${sigv.ident}`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      checkSigv(res.body);
      expect(res.body).toEqual(expect.objectContaining(CREATE_DATA));
    });
  });

  describe('POST', () => {
    test('/ - 201 Created', async () => {
      const res = await request
        .post(`/api/reports/${report.ident}/signature-variants`)
        .send(CREATE_DATA)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.CREATED);

      checkSigv(res.body);
      expect(res.body).toEqual(expect.objectContaining(CREATE_DATA));

      // Check that record was created in the db
      let result = await db.models.signatureVariants.findOne({where: {ident: res.body.ident}});
      expect(result).not.toBeNull();

      // Get public view of direct db query for testing
      result = result.view('public');

      checkSigv(result);
      expect(result).toEqual(expect.objectContaining(CREATE_DATA));
    });
  });

  describe('PUT', () => {
    let sigvUpdate;

    beforeEach(async () => {
      sigvUpdate = await db.models.signatureVariants.create({...CREATE_DATA, reportId: report.id});
    });

    afterEach(async () => {
      await db.models.signatureVariants.destroy({where: {ident: sigvUpdate.ident}, force: true});
    });

    test('/{sigv} - 200 Success', async () => {
      const res = await request
        .put(`/api/reports/${report.ident}/signature-variants/${sigvUpdate.ident}`)
        .send(UPDATE_DATA)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      checkSigv(res.body);
      expect(res.body).toEqual(expect.objectContaining(UPDATE_DATA));
    });

    test('/{sigv} - 400 Bad Request Failed Validation', async () => {
      await request
        .put(`/api/reports/${report.ident}/signature-variants/${sigvUpdate.ident}`)
        .send({...UPDATE_DATA, id: 6})
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.BAD_REQUEST);
    });

    test('/{sigv} - 404 Not Found No SIGV data to update', async () => {
      // First soft-delete record
      await db.models.signatureVariants.destroy({where: {ident: sigvUpdate.ident}});

      await request
        .put(`/api/reports/${report.ident}/signature-variants/${sigvUpdate.ident}`)
        .send(UPDATE_DATA)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.NOT_FOUND);
    });
  });

  describe('DELETE', () => {
    let sigvDelete;

    beforeEach(async () => {
      sigvDelete = await db.models.signatureVariants.create({...CREATE_DATA, reportId: report.id});
    });

    afterEach(async () => {
      await db.models.signatureVariants.destroy({where: {ident: sigvDelete.ident}, force: true});
    });

    test('/{sigv} - 204 No content', async () => {
      await request
        .delete(`/api/reports/${report.ident}/signature-variants/${sigvDelete.ident}`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.NO_CONTENT);

      // Verify that the record was deleted
      const result = await db.models.signatureVariants.findOne({where: {id: sigvDelete.id}});

      expect(result).toBeNull();
    });

    test('/{sigv} - 404 Not Found No sigv data to delete', async () => {
      // First soft-delete record
      await db.models.signatureVariants.destroy({where: {ident: sigvDelete.ident}});

      await request
        .delete(`/api/reports/${report.ident}/signature-variants/${sigvDelete.ident}`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.NOT_FOUND);
    });
  });

  // delete report
  afterAll(async () => {
    // delete newly created report and all of it's components
    // indirectly by hard deleting newly created patient
    report.destroy({force: true});
  });
});

afterAll(async () => {
  global.gc && global.gc();
  await server.close();
});
