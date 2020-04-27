process.env.NODE_ENV = 'test';

const supertest = require('supertest');
const getPort = require('get-port');
const db = require('../../../app/models');

const mockReportData = require('../../testData/mockReportData.json');

const CONFIG = require('../../../app/config');
const {listen} = require('../../../app');

CONFIG.set('env', 'test');

const {username, password} = CONFIG.get('testing');

const LONGER_TIMEOUT = 50000;

let server;
let request;

const kbMatchProperties = ['ident', 'createdAt', 'updatedAt', 'category', 'approvedTherapy', 'kbVariant', 'disease', 'relevance', 'context', 'status', 'reference', 'sample', 'evidenceLevel', 'matchedCancer',
  'pmidRef', 'variantType', 'kbVariantId', 'kbStatementId', 'kbData', 'variant'];

const checkKbMatch = (kbMatchObject) => {
  kbMatchProperties.forEach((element) => {
    expect(kbMatchObject).toHaveProperty(element);
  });
};

// Start API
beforeAll(async () => {
  const port = await getPort({port: CONFIG.get('web:port')});
  server = await listen(port);
  request = supertest(server);
});

// Tests for uploading a report and all of its components
describe('/reports/{REPORTID}/kb-matches endpoint testing', () => {
  let reportId;
  let reportIdent;
  let kbMatchIdent;

  beforeAll(async () => {
    // create report
    const res = await request
      .post('/api/reports')
      .auth(username, password)
      .send(mockReportData)
      .type('json')
      .expect(200);

    expect(typeof res.body).toBe('object');
    reportIdent = res.body.ident;
  }, LONGER_TIMEOUT);

  test('Getting all kb-matches is ok', async () => {
    const res = await request
      .get(`/api/reports/${reportIdent}/kb-matches`)
      .auth(username, password)
      .type('json')
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    checkKbMatch(res.body[0]);
    kbMatchIdent = res.body[0].ident;
  });

  test('Getting a specific kb-match is ok', async () => {
    const res = await request
      .get(`/api/reports/${reportIdent}/kb-matches/${kbMatchIdent}`)
      .auth(username, password)
      .type('json')
      .expect(200);

    checkKbMatch(res.body);
  });

  // delete report
  afterAll(async () => {
    // delete newly created report and all of it's components
    // by hard deleting newly created report
    await db.models.analysis_report.destroy({where: {id: reportId}, force: true});

    // verify report is deleted
    await request
      .get(`/api/reports/${reportIdent}`)
      .auth(username, password)
      .type('json')
      .expect(404);
  }, LONGER_TIMEOUT);
});

afterAll(async () => {
  await server.close();
});
