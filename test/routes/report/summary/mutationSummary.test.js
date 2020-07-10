const HTTP_STATUS = require('http-status-codes');

const uuidv4 = require('uuid/v4');
const supertest = require('supertest');
const getPort = require('get-port');
const db = require('../../../../app/models');

const mockReportData = require('../../../testData/mockReportData.json');

const CONFIG = require('../../../../app/config');
const {listen} = require('../../../../app');

CONFIG.set('env', 'test');

const {username, password} = CONFIG.get('testing');

const LONGER_TIMEOUT = 50000;

let server;
let request;

const mutationSummaryProperties = ['ident', 'createdAt', 'updatedAt', 'comparator', 'snv', 'snv_truncating', 'indels', 'indels_frameshift', 'sv', 'sv_expressed', 'snv_percentile', 'indel_percentile', 'sv_percentile'];

const checkMutationSummary = (mutationObject) => {
  mutationSummaryProperties.forEach((element) => {
    expect(mutationObject).toHaveProperty(element);
  });
};

// Start API
beforeAll(async () => {
  const port = await getPort({port: CONFIG.get('web:port')});
  server = await listen(port);
  request = supertest(server);
});

// Tests for /mutationSummary endpoint
describe('/reports/{REPORTID}/summary/mutation-summary', () => {
  const mutationComparator = 'SARC';
  const randomUuid = uuidv4();

  let report;
  let mutationSummary;

  beforeEach(async () => {
    // Create Report and Mutation Summary
    report = await db.models.analysis_report.create({
      patientId: mockReportData.patientId,
    });

    mutationSummary = await db.models.mutationSummary.create({
      reportId: report.id,
      comparator: mutationComparator,
    });
  }, LONGER_TIMEOUT);

  describe('GET', () => {
    test('Getting a list of mutations is OK', async () => {
      const res = await request
        .get(`/api/reports/${report.ident}/summary/mutation-summary`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      expect(Array.isArray(res.body)).toBe(true);
      checkMutationSummary(res.body[0]);
      expect(res.body[0].comparator).toEqual(mutationComparator);
    });

    test('Getting a specific mutation is OK', async () => {
      const res = await request
        .get(`/api/reports/${report.ident}/summary/mutation-summary/${mutationSummary.ident}`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      checkMutationSummary(res.body);
      expect(res.body.comparator).toEqual(mutationComparator);
    });

    test('Getting a not existent mutation returns not found', async () => {
      await request
        .get(`/api/reports/${report.ident}/summary/mutation-summary/${randomUuid}`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.NOT_FOUND);
    });
  });

  describe('PUT', () => {
    test('Updating a mutation is OK', async () => {
      const res = await request
        .put(`/api/reports/${report.ident}/summary/mutation-summary/${mutationSummary.ident}`)
        .auth(username, password)
        .type('json')
        .send({
          comparator: 'SYTHR',
        })
        .expect(HTTP_STATUS.OK);

      checkMutationSummary(res.body);
      expect(res.body.comparator).toEqual('SYTHR');
    });
  });

  // delete report
  afterEach(async () => {
    await db.models.analysis_report.destroy({where: {id: report.id}, force: true});
  }, LONGER_TIMEOUT);
});

afterAll(async () => {
  await server.close();
});
