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

// Start API
beforeAll(async () => {
  const port = await getPort({port: CONFIG.get('web:port')});
  server = await listen(port);
  request = supertest(server);
});

describe('/reports/{REPORTID}/summary/analyst-comments', () => {
  let report;

  beforeAll(async () => {
    // Get genomic template
    const template = await db.models.template.findOne({where: {name: 'genomic'}});
    // create a report to be used in tests
    // TODO: Update report upload to report mocking once metadata is simplified
    // const project = await db.models.project.findOne(); // any project is fine
    report = await db.models.report.create({
      templateId: template.id,
      patientId: 'PATIENT1234',
    });

    // Create initial comment to be tested
    await request
      .put(`/api/reports/${report.ident}/summary/analyst-comments`)
      .auth(username, password)
      .type('json')
      .send({comments: 'This is the first comment'})
      .expect(200);
  });

  test('GET / comment - 200 Success', async () => {
    // Test GET endpoint and also if comment was created successfully
    const res = await request
      .get(`/api/reports/${report.ident}/summary/analyst-comments`)
      .auth(username, password)
      .type('json')
      .expect(200);

    expect(res.body).toEqual(expect.objectContaining({
      ident: expect.any(String),
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
      comments: expect.any(String),
    }));
  });

  describe('PUT', () => {
    // Tests for PUT endpoints
    describe('Test PUT comments', () => {
      // Tests for adding/editing comments
      test('PUT / comment - 200 Success', async () => {
        const res = await request
          .put(`/api/reports/${report.ident}/summary/analyst-comments`)
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
          .put('/api/reports/NOT_REPORT/summary/analyst-comments')
          .auth(username, password)
          .type('json')
          .send({comments: 'This is a sample comment'})
          .expect(404);
      });
    });
  });

  describe('DELETE', () => {
    // Tests for DELETE endpoints
    describe('Test DELETE comments', () => {
      // Test for deleting analysis comments
      test('DELETE / comment - 204 Success', async () => {
        await request
          .delete(`/api/reports/${report.ident}/summary/analyst-comments`)
          .auth(username, password)
          .type('json')
          .expect(204);
      });
    });
  });

  afterAll(async () => {
    // Delete newly created report and all of it's components
    // indirectly by force deleting the report
    return db.models.report.destroy({where: {ident: report.ident}, force: true});
  });
});

afterAll(async () => {
  global.gc && global.gc();
  await server.close();
});
