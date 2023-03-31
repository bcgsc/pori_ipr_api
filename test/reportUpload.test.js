const HTTP_STATUS = require('http-status-codes');
const supertest = require('supertest');
const getPort = require('get-port');
const db = require('../app/models');

const mockReportData = require('./testData/mockReportData.json');

const CONFIG = require('../app/config');
const {listen} = require('../app');

CONFIG.set('env', 'test');

const {username, password} = CONFIG.get('testing');

const LONGER_TIMEOUT = 50000;

let server;
let request;

// Start API
beforeAll(async () => {
  const port = await getPort({port: CONFIG.get('web:port')});
  server = await listen(port);
  request = supertest(server);
});

// Tests for uploading a report and all of its components
describe('Tests for uploading a report and all of its components', () => {
  let reportId;
  let reportIdent;

  beforeAll(async () => {
    // Assure projects exists before creating report
    await db.models.project.findOrCreate({
      where: {
        name: 'TEST',
      },
    });

    await db.models.project.findOrCreate({
      where: {
        name: 'TEST2',
      },
    });

    // create report
    let res = await request
      .post('/api/reports')
      .auth(username, password)
      .send(mockReportData)
      .type('json')
      .expect(HTTP_STATUS.CREATED);

    expect(typeof res.body).toBe('object');

    reportIdent = res.body.ident;

    // check that the report was created
    res = await request
      .get(`/api/reports/${reportIdent}`)
      .auth(username, password)
      .type('json')
      .expect(HTTP_STATUS.OK);

    // get report id from doing a db find because it's not returned by the API
    const result = await db.models.report.findOne({where: {ident: reportIdent}, attributes: ['id']});
    reportId = result.id;
  }, LONGER_TIMEOUT);

  // Test that all components were created
  test('All components were created correctly', async () => {
    // for all components, do a find where report_id
    // is the same as the created report id
    const {
      ReportUserFilter, createdBy, template, signatures,
      presentationDiscussion, presentationSlides,
      users, projects, ...associations
    } = db.models.report.associations;

    const promises = [];
    // verify all report components were created
    Object.values(associations).forEach(async (association) => {
      const model = association.target.name;
      promises.push(db.models[model].findAll({where: {reportId}}));
    });

    const components = await Promise.all(promises);

    // results should be a non-empty array
    components.forEach((component) => {
      expect(Array.isArray(component)).toBe(true);
      expect(component.length).toBeGreaterThan(0);
    });
  }, LONGER_TIMEOUT);

  test('Genes entries were created correctly from variant and gene rows', async () => {
    const genes = await db.models.genes.findAll({where: {reportId}});
    expect(genes).toHaveProperty('length', 5);

    // gene flags should be added from genes section if given
    expect(genes).toEqual(expect.arrayContaining([expect.objectContaining({
      name: 'ZFP36L2',
      oncogene: true,
    })]));
  });

  test('Template was linked correctly', async () => {
    // Get Report and test that the template data in the report is correct
    const report = await db.models.report.findOne({where: {id: reportId}, attributes: ['templateId']});
    const template = await db.models.template.findOne({where: {name: 'genomic'}, attributes: ['id']});

    expect(template.id).toBe(report.templateId);
  });

  afterAll(async () => {
    // Delete newly created report and all of it's components
    // by force deleting the report
    return db.models.report.destroy({where: {id: reportId}, force: true});
  });
});

// Tests for uploading a report and all of its components
describe('Test for uploading a report with empty image data', () => {
  test('Upload fails on empty image data', async () => {
    // create report
    const emptyImageMockReportData = mockReportData;
    emptyImageMockReportData.images[0].path = 'test/testData/images/empty_image.png';
    const res = await request
      .post('/api/reports')
      .auth(username, password)
      .send(emptyImageMockReportData)
      .type('json')
      .expect(HTTP_STATUS.BAD_REQUEST);

    expect(typeof res.body).toBe('object');
  }, LONGER_TIMEOUT);
});

afterAll(async () => {
  await server.close();
});
