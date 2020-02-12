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

// Start API
beforeAll(async () => {
  const port = await getPort({port: CONFIG.get('web:port')});
  server = await listen(port);
  request = supertest(server);
});

describe('/POG/{POGID}/report/{REPORTID}/genomic/summary/analystComments endpoint testing', () => {
  const pogId = mockReportData.pog.POGID;
  let reportIdent;

  beforeAll(async () => {
    // create a report to be used in tests
    const res = await request
      .post('/api/1.0/reports')
      .auth(username, password)
      .send(mockReportData)
      .type('json')
      .expect(200);

    expect(typeof res.body).toBe('object');
    reportIdent = res.body.ident;

    // Create initial comment to be tested
    await request
      .put(`/api/1.0/POG/${pogId}/report/${reportIdent}/genomic/summary/analystComments`)
      .auth(username, password)
      .type('json')
      .send({comments: 'This is the first comment'})
      .expect(200);
  });

  test('GET / comment - 200 Success', async () => {
    // Test GET endpoint and also if comment was created successfully
    const res = await request
      .get(`/api/1.0/POG/${pogId}/report/${reportIdent}/genomic/summary/analystComments`)
      .auth(username, password)
      .type('json')
      .expect(200);

    expect(res.body).toEqual(expect.objectContaining({
      ident: expect.any(String),
      comments: expect.any(String),
      reviewerSignature: expect.any(Object),
      authorSignature: expect.any(Object),
    }));
  });

  describe('PUT', () => {
    // Tests for PUT endpoints
    describe('Test PUT comments', () => {
      // Tests for adding/editing comments
      test('PUT / comment - 200 Success', async () => {
        const res = await request
          .put(`/api/1.0/POG/${pogId}/report/${reportIdent}/genomic/summary/analystComments`)
          .auth(username, password)
          .type('json')
          .send({comments: 'This is another comment'})
          .expect(200);

        expect(res.body).toEqual(expect.objectContaining({
          ident: expect.any(String),
          comments: 'This is another comment',
        }));
      });

      test('PUT / comment - 404 POG not found', async () => {
        await request
          .put(`/api/1.0/POG/NOT_POG/report/${reportIdent}/genomic/summary/analystComments`)
          .auth(username, password)
          .type('json')
          .send({comments: 'This is a sample comment'})
          .expect(404);
      });

      test('PUT / comment - 404 Report not found', async () => {
        await request
          .put(`/api/1.0/POG/${pogId}/report/NOT_REPORT/genomic/summary/analystComments`)
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
          .put(`/api/1.0/POG/${pogId}/report/${reportIdent}/genomic/summary/analystComments/sign/author`)
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
          .put(`/api/1.0/POG/${pogId}/report/${reportIdent}/genomic/summary/analystComments/sign/reviewer`)
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
          .put(`/api/1.0/POG/${pogId}/report/${reportIdent}/genomic/summary/analystComments/sign/NOT_EXISTENT_ROLE`)
          .auth(username, password)
          .type('json')
          .expect(404);
      });
    });

    describe('Test revoking signatures', () => {
      // Tests for revoking signatures and invalid inputs
      test('PUT /sign/revoke/author revoke sign comment as author - 200 Success', async () => {
        const res = await request
          .put(`/api/1.0/POG/${pogId}/report/${reportIdent}/genomic/summary/analystComments/sign/revoke/author`)
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
          .put(`/api/1.0/POG/${pogId}/report/${reportIdent}/genomic/summary/analystComments/sign/revoke/reviewer`)
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
          .put(`/api/1.0/POG/${pogId}/report/${reportIdent}/genomic/summary/analystComments/sign/revoke/NOT_EXISTENT_ROLECLEAR`)
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
    await db.models.POG.destroy({where: {POGID: mockReportData.pog.POGID}, force: true});

    // verify report is deleted
    await request
      .get(`/api/1.0/reports/${reportIdent}`)
      .auth(username, password)
      .type('json')
      .expect(404);
  });
});

afterAll(async () => {
  await server.close();
});
