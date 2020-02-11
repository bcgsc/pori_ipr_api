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
    // create report
    // TODO: Use models to create the report, revert package.json to run all tests
    const res = await request
      .post('/api/1.0/reports')
      .auth(username, password)
      .send(mockReportData)
      .type('json')
      .expect(200);

    expect(typeof res.body).toBe('object');
    reportIdent = res.body.ident;
  });

  test('PUT / new comment - 200 Success', async () => {
    const res = await request
      .put(`/api/1.0/POG/${pogId}/report/${reportIdent}/genomic/summary/analystComments`)
      .auth(username, password)
      .type('json')
      .send({comments: 'This is a sample comment'})
      .expect(200);

    expect(res.body).toEqual(expect.objectContaining({
      ident: expect.any(String),
      id: expect.any(Number),
      comments: 'This is a sample comment',
      pog_id: expect.any(Number),
      report_id: expect.any(Number),
    }));
  });

  test('PUT / new comment - 404 POG not found', async () => {
    await request
      .put(`/api/1.0/POG/NOT_POG/report/${reportIdent}/genomic/summary/analystComments`)
      .auth(username, password)
      .type('json')
      .send({comments: 'This is a sample comment'})
      .expect(404);
  });

  test('PUT / new comment - 404 Report not found', async () => {
    await request
      .put(`/api/1.0/POG/${pogId}/report/NOT_REPORT/genomic/summary/analystComments`)
      .auth(username, password)
      .type('json')
      .send({comments: 'This is a sample comment'})
      .expect(404);
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
