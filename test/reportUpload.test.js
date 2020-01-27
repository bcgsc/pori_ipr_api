process.env.NODE_ENV = 'test';

const supertest = require('supertest');
const getPort = require('get-port');
const db = require('../app/models');

const mockReportData = require('./mockReportData.json');

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
  let pogId;
  let reportIdent;

  beforeAll(async () => {
    // create report
    let res = await request
      .post('/api/1.0/reports')
      .auth(username, password)
      .send(mockReportData)
      .type('json')
      .expect(200);

    expect(typeof res.body).toBe('object');

    reportIdent = res.body.ident;

    // check that the report was created
    res = await request
      .get(`/api/1.0/reports/${reportIdent}`)
      .auth(username, password)
      .type('json')
      .expect(200);

    // get report id from patient info. because it's excluded in public view
    reportId = res.body.patientInformation.report_id;
  }, LONGER_TIMEOUT);

  // Test that all components were created
  test('Test that all components were created', async () => {
    // check that the POG was created by searching by POGID
    const res = await request
      .get(`/api/1.0/POG/${mockReportData.pog.POGID}`)
      .auth(username, password)
      .type('json')
      .expect(200);

    pogId = res.body.id;

    // check that the pog_analysis was created by searching
    // based on pog_id and analysis_biopsy
    const pogAnalysis = await db.models.pog_analysis.findOne({where: {pog_id: pogId, analysis_biopsy: mockReportData.analysis.analysis_biopsy}});

    expect(pogAnalysis).not.toBeNull();
    expect(typeof pogAnalysis).toBe('object');

    // for all components, do a find where report_id
    // is the same as the created report id
    const {pog, analysis, ReportUserFilter, createdBy, probe_signature, presentation_discussion, presentation_slides, users, analystComments, ...associations} = db.models.analysis_report.associations;

    const promises = [];
    // verify all report components were created
    Object.values(associations).forEach(async (association) => {
      const model = association.target.name;
      promises.push(db.models[model].findAll({where: {report_id: reportId}}));
    });

    const components = await Promise.all(promises);

    // results should be a non-empty array
    components.forEach((component) => {
      expect(Array.isArray(component)).toBe(true);
      expect(component.length).toBeGreaterThan(0);
    });
  }, LONGER_TIMEOUT);

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
  }, LONGER_TIMEOUT);
});

afterAll(async () => {
  await server.close();
});
