const HTTP_STATUS = require('http-status-codes');
const supertest = require('supertest');
const getPort = require('get-port');

const db = require('../../../app/models');
// get test user info
const CONFIG = require('../../../app/config');
const {listen} = require('../../../app');

const mockData = require('../../testData/mockGermlineReportData.json');

// get credentials from the CONFIG
CONFIG.set('env', 'test');
const {username, password} = CONFIG.get('testing');

const BASE_URL = '/api/1.0/germline-small-mutation';

describe('/germline-small-mutation', () => {
  let server;
  let request;

  beforeAll(async () => {
    const port = await getPort({port: CONFIG.get('web:port')});
    server = await listen(port);
    request = supertest(server);
  });

  afterAll(async () => {
    await server.close();
  });


  describe('POST (create) /patient/:patient/biopsy/:biopsy', () => {
    test('valid input - ok', async () => {
      const {body: record} = await request
        .post(`${BASE_URL}/patient/FAKE/biopsy/biop1`)
        .auth(username, password)
        .type('json')
        .send({...mockData})
        .expect(HTTP_STATUS.CREATED);
      expect(record).toHaveProperty('ident');

      // clean up the newly created report
      await db.models.germline_small_mutation.destroy({
        where: {ident: record.ident},
        force: true,
      });
    });
  });

  test('GET / search reports', async () => {
    const {body} = await request
      .get(BASE_URL)
      .auth(username, password)
      .type('json')
      .send({...mockData})
      .expect(HTTP_STATUS.OK);
    expect(body).toHaveProperty('reports');
    const {reports} = body;
    expect(Array.isArray(reports)).toBe(true);
    // NOTE: depends on at least 1 germline report existing in the DB
    expect(reports.length).toBeGreaterThan(0);
    const [sample] = reports;
    expect(sample).toHaveProperty('ident');
    expect(sample).toHaveProperty('biopsyName');
    expect(sample).toHaveProperty('patientId');
    expect(sample).toHaveProperty('reviews');
    expect(sample).toHaveProperty('variants');
    expect(sample).toHaveProperty('projects');
    // all reports should be associated with 1+ projects
    expect(sample.projects).toBeInstanceOf(Array);
    expect(sample.projects.length).toBeGreaterThan(0);
  });

  describe('tests dependent on existing report', () => {
    test.todo('update variant information');

    test.todo('add biofx review');

    test.todo('add projects review');

    test.todo('GET report by ID');
  });
});
