const HTTP_STATUS = require('http-status-codes');
const supertest = require('supertest');
const getPort = require('get-port');
const db = require('../../../app/models');

// get test user info
const CONFIG = require('../../../app/config');
const {listen} = require('../../../app');

CONFIG.set('env', 'test');
const {username, password} = CONFIG.get('testing');

let server;
let request;

const IMMUNE_CELL_TYPES_DATA = {
  cellType: 'combined T cell',
  kbCategory: 'moderate',
  score: 23,
  percentile: 30,
};

const UPDATE_DATA = {
  cellType: 'updated cell type',
  kbCategory: 'severe',
  score: 57,
  percentile: 90,
};

const immuneCellTypesProperties = [
  'ident', 'createdAt', 'updatedAt', 'cellType', 'kbCategory', 'score', 'percentile',
];

const checkImmuneCellTypesProperties = (cellType) => {
  immuneCellTypesProperties.forEach((property) => {
    expect(cellType).toHaveProperty(property);
  });

  expect(cellType).toEqual(expect.not.objectContaining({
    id: expect.any(Number),
    reportId: expect.any(Number),
    deletedAt: expect.any(String),
  }));
};

// Start API
beforeAll(async () => {
  const port = await getPort({port: CONFIG.get('web:port')});
  server = await listen(port);
  request = supertest(server);
});

describe('/reports/{REPORTID}/immune-cell-types', () => {
  let report;
  let cellType;

  beforeAll(async () => {
    // Get genomic template
    const template = await db.models.template.findOne({where: {name: 'genomic'}});
    // create a report to be used in tests
    report = await db.models.report.create({
      templateId: template.id,
      patientId: 'PATIENT1234',
    });

    // Create initial immune cell type
    cellType = await db.models.immuneCellTypes.create({...IMMUNE_CELL_TYPES_DATA, reportId: report.id});
  });

  describe('GET', () => {
    test('/ - 200 Success', async () => {
      // Test GET endpoint and also if immune cell types were created successfully
      const res = await request
        .get(`/api/reports/${report.ident}/immune-cell-types`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);

      const [entry] = res.body;

      expect(entry).toEqual(expect.objectContaining(IMMUNE_CELL_TYPES_DATA));
    });

    test('/{immuneCellType} - 200 Success', async () => {
      const res = await request
        .get(`/api/reports/${report.ident}/immune-cell-types/${cellType.ident}`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      checkImmuneCellTypesProperties(res.body);
    });
  });

  describe('PUT', () => {
    let cellTypeUpdate;

    beforeEach(async () => {
      cellTypeUpdate = await db.models.immuneCellTypes.create({...IMMUNE_CELL_TYPES_DATA, reportId: report.id});
    });

    afterEach(async () => {
      await db.models.immuneCellTypes.destroy({where: {ident: cellTypeUpdate.ident}, force: true});
    });

    test('/{immuneCellType} - 200 Success', async () => {
      const res = await request
        .put(`/api/reports/${report.ident}/immune-cell-types/${cellTypeUpdate.ident}`)
        .send(UPDATE_DATA)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      checkImmuneCellTypesProperties(res.body);
      expect(res.body).toEqual(expect.objectContaining(UPDATE_DATA));
    });

    test('/{immuneCellType} - 400 Bad Request Failed Validation', async () => {
      await request
        .put(`/api/reports/${report.ident}/immune-cell-types/${cellTypeUpdate.ident}`)
        .send({...UPDATE_DATA, id: 6})
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.BAD_REQUEST);
    });
  });

  describe('POST', () => {
    test('Create new immune cell type - 200 Success', async () => {
      const res = await request
        .post(`/api/reports/${report.ident}/immune-cell-types`)
        .send(IMMUNE_CELL_TYPES_DATA)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      checkImmuneCellTypesProperties(res.body);
      expect(res.body).toEqual(expect.objectContaining(IMMUNE_CELL_TYPES_DATA));
    });
  });

  describe('DELETE', () => {
    let cellTypeDelete;

    beforeEach(async () => {
      cellTypeDelete = await db.models.immuneCellTypes.create({...IMMUNE_CELL_TYPES_DATA, reportId: report.id});
    });

    afterEach(async () => {
      await db.models.immuneCellTypes.destroy({where: {ident: cellTypeDelete.ident}, force: true});
    });

    test('/{immuneCellType} - 204 No content', async () => {
      await request
        .delete(`/api/reports/${report.ident}/immune-cell-types/${cellType.ident}`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.NO_CONTENT);
    });
  });

  afterAll(async () => {
    // Delete newly created report and all of it's components
    // indirectly by hard deleting report
    return db.models.report.destroy({where: {ident: report.ident}, force: true});
  });
});

afterAll(async () => {
  global.gc && global.gc();
  await server.close();
});
