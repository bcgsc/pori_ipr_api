const getPort = require('get-port');
const supertest = require('supertest');
const HTTP_STATUS = require('http-status-codes');

const db = require('../../../app/models');
// get test user info
const CONFIG = require('../../../app/config');
const {listen} = require('../../../app');

CONFIG.set('env', 'test');
const {username, password} = CONFIG.get('testing');

const tcgaV8 = require('../../../database/exp_matrix.v8.json');
const tcgaV9 = require('../../../database/exp_matrix.v9.json');

const APPENDIX_DATA = {
  sampleInfo: [{Sample: 'Tumour', 'Collection Date': '23-09-20'}],
  seqQC: [{Reads: '2534M', bioQC: 'passed'}],
  config: 'TEST CONFIG',
};

const appendixProperties = [
  'sampleInfo', 'seqQC', 'config',
];

const checkAppendix = (appendixObject) => {
  appendixProperties.forEach((element) => {
    expect(appendixObject).toHaveProperty(element);
  });
  expect(appendixObject).toEqual(expect.not.objectContaining({
    id: expect.any(Number),
    reportId: expect.any(Number),
    updatedBy: expect.any(Number),
    deletedAt: expect.any(String),
  }));
};

let server;
let request;

// Start API
beforeAll(async () => {
  const port = await getPort({port: CONFIG.get('web:port')});
  server = await listen(port);
  request = supertest(server);
});

describe('/reports/{report}/appendices', () => {
  let template;

  beforeAll(async () => {
    // Get genomic template
    template = await db.models.template.findOne({where: {name: 'genomic'}});
  });

  describe('GET', () => {
    let report;

    beforeEach(async () => {
    // Create report
      report = await db.models.report.create({
        ...APPENDIX_DATA,
        templateId: template.id,
        patientId: 'APPENDIX_TEST_PATIENT',
      });
    });

    afterEach(async () => {
      return report.destroy({force: true});
    });

    test('/ - 200 Success', async () => {
      const res = await request
        .get(`/api/reports/${report.ident}/appendices`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      expect(res.body).not.toBeNull();
      checkAppendix(res.body);
      expect(res.body).toEqual(expect.objectContaining(APPENDIX_DATA));
    });

    test('/tcga - 200 Success - Expression matrix v8', async () => {
      // Set expression matrix to v8
      await report.update({expression_matrix: 'v8'});

      const res = await request
        .get(`/api/reports/${report.ident}/appendices/tcga`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      expect(res.body).not.toBeNull();
      expect(res.body).toEqual(tcgaV8);
    });

    test('/tcga - 200 Success - Expression matrix v9', async () => {
      // Set expression matrix to v9
      await report.update({expression_matrix: 'v9'});

      const res = await request
        .get(`/api/reports/${report.ident}/appendices/tcga`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      expect(res.body).not.toBeNull();
      expect(res.body).toEqual(tcgaV9);
    });

    test('/tcga - 200 Success - Unknown expression matrix', async () => {
      // Set expression matrix to random version
      await report.update({expression_matrix: 'v100'});

      const res = await request
        .get(`/api/reports/${report.ident}/appendices/tcga`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      expect(res.body).not.toBeNull();
      expect(res.body).toEqual(expect.objectContaining([]));
    });
  });
});

afterAll(async () => {
  global.gc && global.gc();
  await server.close();
});
