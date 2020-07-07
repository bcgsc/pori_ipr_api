const supertest = require('supertest');
const getPort = require('get-port');
const db = require('../../../app/models');

// get test user info
const CONFIG = require('../../../app/config');
const {listen} = require('../../../app');

CONFIG.set('env', 'test');
const {username, password} = CONFIG.get('testing');

let server;
let request;

const signatureProperties = ['ident', 'createdAt', 'updatedAt', 'username', 'type', 'firstName', 'lastName', 'email', 'lastLogin'];
// Properties of res.body.reviewerSignature and res.body.authorSignature
const checkSignatureProperties = (signature) => {
  // Function for checking reviewer and author signatures
  signatureProperties.forEach((property) => {
    expect(signature).toHaveProperty(property);
  });
};

// Start API
beforeAll(async () => {
  const port = await getPort({port: CONFIG.get('web:port')});
  server = await listen(port);
  request = supertest(server);
});

describe('/reports/{REPORTID}/signatures endpoint testing', () => {
  let report;

  beforeAll(async () => {
    // create a report to be used in tests
    // TODO: Update report upload to report mocking once metadata is simplified
    // const project = await db.models.project.findOne(); // any project is fine
    report = await db.models.analysis_report.create({
      type: 'genomic',
      patientId: 'PATIENT1234',
    });

    // Create initial report signature
    await request
      .put(`/api/reports/${report.ident}/signatures/sign/author`)
      .auth(username, password)
      .type('json')
      .expect(200);
  });

  test('GET / signatures - 200 Success', async () => {
    // Test GET endpoint and also if signature was created successfully
    const res = await request
      .get(`/api/reports/${report.ident}/signatures`)
      .auth(username, password)
      .type('json')
      .expect(200);

    const {body: {reviewerSignature, authorSignature}} = res;
    expect(res.body).toEqual(expect.objectContaining({
      ident: expect.any(String),
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
      reviewerSignature: expect.any(Object),
      authorSignature: expect.any(Object),
    }));
    expect(res.body).toHaveProperty('reviewerSignedAt');
    expect(res.body).toHaveProperty('authorSignedAt');
    checkSignatureProperties(reviewerSignature);
    checkSignatureProperties(authorSignature);

    // check that an author was added and a reviewer wasn't
    expect(res.body).toEqual(expect.objectContaining({
      ident: expect.any(String),
      authorSignedAt: expect.any(String),
      reviewerSignedAt: null,
    }));
  });

  describe('PUT', () => {
    // Tests for PUT endpoints
    describe('Tests for adding a signature', () => {
      // Tests for adding a signature
      test('PUT /sign/author update author signature - 200 Success', async () => {
        const res = await request
          .put(`/api/reports/${report.ident}/signatures/sign/author`)
          .auth(username, password)
          .type('json')
          .expect(200);

        expect(res.body).toEqual(expect.objectContaining({
          ident: expect.any(String),
          authorSignedAt: expect.any(String),
        }));
      });

      test('PUT /sign/reviewer update signatures by adding a reviewer signature - 200 Success', async () => {
        const res = await request
          .put(`/api/reports/${report.ident}/signatures/sign/reviewer`)
          .auth(username, password)
          .type('json')
          .expect(200);

        expect(res.body).toEqual(expect.objectContaining({
          ident: expect.any(String),
          reviewerSignedAt: expect.any(String),
        }));
      });

      test('PUT /sign/INVALID sign with a not existing role - 404 Not Found', async () => {
        await request
          .put(`/api/reports/${report.ident}/signatures/sign/NOT_EXISTENT_ROLE`)
          .auth(username, password)
          .type('json')
          .expect(404);
      });
    });

    describe('Test revoking signatures', () => {
      // Tests for revoking signatures and invalid inputs
      test('PUT /revoke/author revoke author signature - 200 Success', async () => {
        const res = await request
          .put(`/api/reports/${report.ident}/signatures/revoke/author`)
          .auth(username, password)
          .type('json')
          .expect(200);

        expect(res.body).toEqual(expect.objectContaining({
          ident: expect.any(String),
          authorSignedAt: null,
        }));
      });

      test('PUT /revoke/reviewer revoke reviewer signature - 200 Success', async () => {
        const res = await request
          .put(`/api/reports/${report.ident}/signatures/revoke/reviewer`)
          .auth(username, password)
          .type('json')
          .expect(200);

        expect(res.body).toEqual(expect.objectContaining({
          ident: expect.any(String),
          reviewerSignedAt: null,
        }));
      });

      test('PUT /revoke/INVALID remove signature for non-existing role - 404 Not Found', async () => {
        await request
          .put(`/api/reports/${report.ident}/signatures/revoke/NOT_EXISTENT_ROLECLEAR`)
          .auth(username, password)
          .type('json')
          .expect(404);
      });
    });
  });

  // delete report
  afterAll(async () => {
    // delete newly created report and all of it's components
    // indirectly by hard deleting newly created patient
    await db.models.analysis_report.destroy({where: {ident: report.ident}, force: true});

    // verify report is deleted
    await request
      .get(`/api/reports/${report.ident}`)
      .auth(username, password)
      .type('json')
      .expect(404);
  });
});

afterAll(async () => {
  await server.close();
});
