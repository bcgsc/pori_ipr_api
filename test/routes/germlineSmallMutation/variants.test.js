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

const BASE_URL = '/api/1.0/germline_small_mutation';


describe('tests dependent on existing report', () => {
  let record;
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


  beforeEach(async () => {
    record = await db.models.germline_small_mutation.create({
      source_version: 'v1.0.0',
      source_path: '/some/random/source/path',
      biofx_assigned: 0,
      exported: false,
      patientId: 'TESTPAT01',
      biopsyName: 'TEST123',
    });
  });

  afterEach(async () => {
    await db.models.germline_small_mutation.destroy({
      where: {ident: record.ident},
      force: true,
    });
  });

  describe('', () => {
    test('', async () => {
    });
  });
});
