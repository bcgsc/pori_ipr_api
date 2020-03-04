process.env.NODE_ENV = 'test';

const supertest = require('supertest');
const getPort = require('get-port');
const db = require('../app/models');

const mockReportData = require('./testData/mockReportData.json');

// get test user info
const CONFIG = require('../app/config');
const {listen} = require('../app');

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

describe('/reports/{REPORTID}/genomic/summary/analyst-comments endpoint testing', () => {
  let reportIdent;

  beforeAll(async () => {
    // create a report to be used in tests
    // TODO: Update report upload to report mocking once metadata is simplified
    const res = await request
      .post('/api/reports')
      .auth(username, password)
      .send(mockReportData)
      .type('json')
      .expect(200);

    expect(typeof res.body).toBe('object');
    reportIdent = res.body.ident;

    // Create initial comment to be tested
    await request
      .put(`/api/reports/${reportIdent}/genomic/summary/analyst-comments`)
      .auth(username, password)
      .type('json')
      .send({comments: 'This is the first comment'})
      .expect(200);
  });

  test('GET / comment - 200 Success', async () => {
    // Test GET endpoint and also if comment was created successfully
    const res = await request
      .get(`/api/reports/${reportIdent}/genomic/summary/analyst-comments`)
      .auth(username, password)
      .type('json')
      .expect(200);

    const {body: {reviewerSignature, authorSignature}} = res;
    expect(res.body).toEqual(expect.objectContaining({
      ident: expect.any(String),
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
      comments: expect.any(String),
      reviewerSignature: expect.any(Object),
      authorSignature: expect.any(Object),
    }));
    expect(res.body).toHaveProperty('reviewerSignedAt');
    expect(res.body).toHaveProperty('authorSignedAt');
    checkSignatureProperties(reviewerSignature);
    checkSignatureProperties(authorSignature);
  });

  describe('PUT', () => {
    // Tests for PUT endpoints
    describe('Test PUT comments', () => {
      // Tests for adding/editing comments
      test('PUT / comment - 200 Success', async () => {
        const res = await request
          .put(`/api/reports/${reportIdent}/genomic/summary/analyst-comments`)
          .auth(username, password)
          .type('json')
          .send({comments: 'This is another comment'})
          .expect(200);

        expect(res.body).toEqual(expect.objectContaining({
          ident: expect.any(String),
          comments: 'This is another comment',
        }));
      });

      test('PUT / comment - 404 Report not found', async () => {
        await request
          .put('/api/reports/NOT_REPORT/genomic/summary/analyst-comments')
          .auth(username, password)
          .type('json')
          .send({comments: 'This is a sample comment'})
          .expect(404);
      });
    });

    describe('Test signing comments', () => {
      // Tests for signing comments and invalid inputs
      test('PUT /sign/author sign comment as author - 200 Success', async () => {
        const res = await request
          .put(`/api/reports/${reportIdent}/genomic/summary/analyst-comments/sign/author`)
          .auth(username, password)
          .type('json')
          .expect(200);

        expect(res.body).toEqual(expect.objectContaining({
          ident: expect.any(String),
          comments: expect.any(String),
          authorSignedAt: expect.any(String),
        }));
      });

      test('PUT /sign/reviewer sign comment as reviewer - 200 Success', async () => {
        const res = await request
          .put(`/api/reports/${reportIdent}/genomic/summary/analyst-comments/sign/reviewer`)
          .auth(username, password)
          .type('json')
          .expect(200);

        expect(res.body).toEqual(expect.objectContaining({
          ident: expect.any(String),
          comments: expect.any(String),
          reviewerSignedAt: expect.any(String),
        }));
      });

      test('PUT /sign/INVALID sign comment as not existing role - 404 Not Found', async () => {
        await request
          .put(`/api/reports/${reportIdent}/genomic/summary/analyst-comments/sign/NOT_EXISTENT_ROLE`)
          .auth(username, password)
          .type('json')
          .expect(404);
      });
    });

    describe('Test revoking signatures', () => {
      // Tests for revoking signatures and invalid inputs
      test('PUT /sign/revoke/author revoke sign comment as author - 200 Success', async () => {
        const res = await request
          .put(`/api/reports/${reportIdent}/genomic/summary/analyst-comments/sign/revoke/author`)
          .auth(username, password)
          .type('json')
          .expect(200);

        expect(res.body).toEqual(expect.objectContaining({
          ident: expect.any(String),
          comments: expect.any(String),
          authorSignedAt: null,
        }));
      });

      test('PUT /sign/revoke/reviewer revoke sign comment as reviewer - 200 Success', async () => {
        const res = await request
          .put(`/api/reports/${reportIdent}/genomic/summary/analyst-comments/sign/revoke/reviewer`)
          .auth(username, password)
          .type('json')
          .expect(200);

        expect(res.body).toEqual(expect.objectContaining({
          ident: expect.any(String),
          comments: expect.any(String),
          reviewerSignedAt: null,
        }));
      });

      test('PUT /sign/revoke/INVALID comment as not existing role - 404 Not Found', async () => {
        await request
          .put(`/api/reports/${reportIdent}/genomic/summary/analyst-comments/sign/revoke/NOT_EXISTENT_ROLECLEAR`)
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
    await db.models.analysis_report.destroy({where: {ident: reportIdent}, force: true});

    // verify report is deleted
    await request
      .get(`/api/reports/${reportIdent}`)
      .auth(username, password)
      .type('json')
      .expect(404);
  });
});

afterAll(async () => {
  await server.close();
});
