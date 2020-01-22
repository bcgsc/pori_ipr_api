process.env.NODE_ENV = 'test';

const chai = require('chai');
const chaiHttp = require('chai-http');
const getPort = require('get-port');
const db = require('../app/models');

const mockReportData = require('./mockReportData.json');

const {expect} = chai;

chai.use(chaiHttp);
chai.use(require('chai-things'));

const CONFIG = require('../app/config');
const {listen} = require('../app');

CONFIG.set('env', 'test');

const {username, password} = CONFIG.get('testing');

let server;

// Start API
before(async () => {
  const port = await getPort({port: CONFIG.get('web:port')});
  server = await listen(port);
});

// Tests for uploading a report and all of its components
describe('Tests for uploading a report and all of its components', () => {
  let reportId;
  let pogId;
  let reportIdent;

  before(async () => {
    // create report
    let res = await chai.request(server)
      .post('/api/1.0/reports')
      .auth(username, password)
      .send(mockReportData)
      .type('json');

    expect(res).to.have.status(200);
    expect(res.body).to.be.an('object');

    reportIdent = res.body.ident;

    // check that the report was created
    res = await chai.request(server)
      .get(`/api/1.0/reports/${reportIdent}`)
      .auth(username, password)
      .type('json');

    expect(res).to.have.status(200);

    // get report id from patient info. because it's excluded in public view
    reportId = res.body.patientInformation.report_id;
  });

  // Test that all components were created
  it('Test that all components were created', async () => {
    // check that the POG was created by searching by POGID
    const res = await chai.request(server)
      .get(`/api/1.0/POG/${mockReportData.pog.POGID}`)
      .auth(username, password)
      .type('json');

    expect(res).to.have.status(200);

    pogId = res.body.id;

    // check that the pog_analysis was created by searching
    // based on pog_id and analysis_biopsy
    const pogAnalysis = await db.models.pog_analysis.findOne({where: {pog_id: pogId, analysis_biopsy: mockReportData.analysis.analysis_biopsy}});

    expect(pogAnalysis).to.be.an('object');
    expect(pogAnalysis).to.not.be.null;

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
      expect(component).to.be.an('array');
      expect(component).to.not.be.empty;
    });
  });

  // delete report
  after(async () => {
    // delete newly created report and all of it's components
    // indirectly by hard deleting newly created patient
    await db.models.POG.destroy({where: {POGID: mockReportData.pog.POGID}, force: true});

    // verify report is deleted
    const res = await chai.request(server)
      .get(`/api/1.0/reports/${reportIdent}`)
      .auth(username, password)
      .type('json');

    expect(res).to.have.status(404);
  });
});

after(async () => {
  await server.close();
});
