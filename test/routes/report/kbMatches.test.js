process.env.NODE_ENV = 'test';
const HTTP_STATUS = require('http-status-codes');

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
  expect(kbMatchObject.variant).toHaveProperty('ident');
};

// Start API
beforeAll(async () => {
  const port = await getPort({port: CONFIG.get('web:port')});
  server = await listen(port);
  request = supertest(server);
});

// Tests for /kb-matches endpoint
describe('/reports/{REPORTID}/kb-matches endpoint testing', () => {
  let reportId;
  let reportIdent;

  beforeAll(async () => {
    // create report
    let res = await request
      .post('/api/reports')
      .auth(username, password)
      .send(mockReportData)
      .type('json')
      .expect(HTTP_STATUS.OK);

    expect(typeof res.body).toBe('object');
    reportIdent = res.body.ident;

    // check that the report was created
    res = await request
      .get(`/api/reports/${reportIdent}`)
      .auth(username, password)
      .type('json')
      .expect(HTTP_STATUS.OK);

    // get report id from patient info. because it's excluded in public view
    reportId = res.body.patientInformation.reportId;
  }, LONGER_TIMEOUT);

  test('Getting all kb-matches is ok', async () => {
    const res = await request
      .get(`/api/reports/${reportIdent}/kb-matches`)
      .auth(username, password)
      .type('json')
      .expect(HTTP_STATUS.OK);

    expect(Array.isArray(res.body)).toBe(true);
    checkKbMatch(res.body[0]);
  });

  test('Getting a specific kb-match is ok', async () => {
    // Get kbMatch ident to be used in tests
    const kbMatch = await db.models.kbMatches.findOne({where: reportId});

    const res = await request
      .get(`/api/reports/${reportIdent}/kb-matches/${kbMatch.ident}`)
      .auth(username, password)
      .type('json')
      .expect(HTTP_STATUS.OK);

    checkKbMatch(res.body);
  });

  // delete report
  afterAll(async () => {
    await db.models.analysis_report.destroy({where: {id: reportId}, force: true});

    // verify report is deleted
    await request
      .get(`/api/reports/${reportIdent}`)
      .auth(username, password)
      .type('json')
      .expect(HTTP_STATUS.NOT_FOUND);
  }, LONGER_TIMEOUT);
});

afterAll(async () => {
  await server.close();
});
