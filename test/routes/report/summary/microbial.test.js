const HTTP_STATUS = require('http-status-codes');
const supertest = require('supertest');
const getPort = require('get-port');
const db = require('../../../../app/models');

// get test user info
const CONFIG = require('../../../../app/config');
const {listen} = require('../../../../app');

CONFIG.set('env', 'test');
const {username, password} = CONFIG.get('testing');

let server;
let request;

const MICROBIAL_DATA = {
  species: 'Human',
  integrationSite: 'None',
};

const MICROBIAL_CREATE_DATA = {
  species: 'Human',
  integrationSite: 'None',
};

const MICROBIAL_UPDATE_DATA = {
  species: 'Whale',
  integrationSite: 'Site 1',
};

const microbialProperties = [
  'ident', 'createdAt', 'updatedAt', 'species', 'integrationSite', 'microbialHidden',
];

const checkMicrobialProperties = (microbial) => {
  microbialProperties.forEach((property) => {
    expect(microbial).toHaveProperty(property);
  });

  expect(microbial).toEqual(expect.not.objectContaining({
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

describe('/reports/{REPORTID}/summary/microbial', () => {
  let report;
  let microbial;

  beforeAll(async () => {
    // Get genomic template
    const template = await db.models.template.findOne({where: {name: 'genomic'}});
    // create a report to be used in tests
    report = await db.models.report.create({
      templateId: template.id,
      patientId: 'PATIENT1234',
    });

    // Create initial microbial data
    microbial = await db.models.microbial.create({...MICROBIAL_DATA, reportId: report.id});
  });

  describe('GET', () => {
    test('/ - 200 Success', async () => {
      // Test GET endpoint and also if immune cell types were created successfully
      const res = await request
        .get(`/api/reports/${report.ident}/summary/microbial`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);

      const [entry] = res.body;

      expect(entry).toEqual(expect.objectContaining(MICROBIAL_DATA));
    });

    test('/{microbial} - 200 Success', async () => {
      const res = await request
        .get(`/api/reports/${report.ident}/summary/microbial/${microbial.ident}`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      checkMicrobialProperties(res.body);
      expect(res.body).toEqual(expect.objectContaining(MICROBIAL_DATA));
    });
  });

  describe('POST', () => {
    test('/ - 201 Created', async () => {
      const res = await request
        .post(`/api/reports/${report.ident}/summary/microbial`)
        .send(MICROBIAL_CREATE_DATA)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.CREATED);

      checkMicrobialProperties(res.body);
      expect(res.body).toEqual(expect.objectContaining(MICROBIAL_DATA));

      // Check that record was created in the db
      let result = await db.models.microbial.findOne({where: {ident: res.body.ident}});
      expect(result).not.toBeNull();

      // Get public view of direct db query for testing
      result = result.view('public');

      checkMicrobialProperties(result);
      expect(result).toEqual(expect.objectContaining(MICROBIAL_DATA));
    });
  });

  describe('PUT', () => {
    let microbialUpdate;

    beforeEach(async () => {
      microbialUpdate = await db.models.microbial.create({...MICROBIAL_CREATE_DATA, reportId: report.id});
    });

    afterEach(async () => {
      await db.models.microbial.destroy({where: {ident: microbialUpdate.ident}, force: true});
    });

    test('/{microbial} - 200 Success', async () => {
      const res = await request
        .put(`/api/reports/${report.ident}/summary/microbial/${microbialUpdate.ident}`)
        .send(MICROBIAL_UPDATE_DATA)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      checkMicrobialProperties(res.body);
      expect(res.body).toEqual(expect.objectContaining(MICROBIAL_UPDATE_DATA));
    });

    test('/{microbial} - 400 Bad Request Failed Validation', async () => {
      await request
        .put(`/api/reports/${report.ident}/summary/microbial/${microbialUpdate.ident}`)
        .send({...MICROBIAL_UPDATE_DATA, id: 6})
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.BAD_REQUEST);
    });

    test('/{microbial} - 404 Not Found No microbial data to update', async () => {
      // First soft-delete record
      await db.models.microbial.destroy({where: {ident: microbialUpdate.ident}});

      await request
        .put(`/api/reports/${report.ident}/summary/microbial/${microbialUpdate.ident}`)
        .send(MICROBIAL_UPDATE_DATA)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.NOT_FOUND);
    });
  });

  describe('DELETE', () => {
    let microbialDelete;

    beforeEach(async () => {
      microbialDelete = await db.models.microbial.create({...MICROBIAL_CREATE_DATA, reportId: report.id});
    });

    afterEach(async () => {
      await db.models.microbial.destroy({where: {ident: microbialDelete.ident}, force: true});
    });

    test('/{microbial} - 204 No content', async () => {
      await request
        .delete(`/api/reports/${report.ident}/summary/microbial/${microbialDelete.ident}`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.NO_CONTENT);

      // Verify that the record was deleted
      const result = await db.models.microbial.findOne({where: {id: microbialDelete.id}});

      expect(result).toBeNull();
    });

    test('/{microbial} - 404 Not Found No microbial data to delete', async () => {
      // First soft-delete record
      await db.models.microbial.destroy({where: {ident: microbialDelete.ident}});

      await request
        .delete(`/api/reports/${report.ident}/summary/microbial/${microbialDelete.ident}`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.NOT_FOUND);
    });
  });

  // delete report
  afterAll(async () => {
    // delete newly created report and all of it's components
    // indirectly by hard deleting newly created patient
    await db.models.report.destroy({where: {ident: report.ident}, force: true});

    // verify report is deleted
    const result = await db.models.report.findOne({where: {ident: report.ident}, paranoid: false});
    expect(result).toBeNull();
  });
});

afterAll(async () => {
  global.gc && global.gc();
  await server.close();
});
