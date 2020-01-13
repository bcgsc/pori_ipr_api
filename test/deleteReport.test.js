process.env.NODE_ENV = 'test';

const request = require('supertest');
const getPort = require('get-port');
const {Op} = require('sequelize');
const db = require('../app/models');

// get test user info
const CONFIG = require('../app/config');
const {listen} = require('../app');

CONFIG.set('env', 'test');

const {username, password} = CONFIG.get('testing');

// ident of report to delete
// the report is from test patient, POGID: 'PATIENT001'
// TODO: replace hardcoded report ident with test report
// created when running tests
const reportIdent = '3CUZR';
const currentComponents = {};
let server;

// Start API
beforeAll(async () => {
  const port = await getPort({port: CONFIG.get('web:port')});
  server = await listen(port);
});

// Tests for deleting a report and all of its components
describe('Tests for deleting a report and all of its components', () => {
  let reportId;
  // get analysis report associations
  const {pog, analysis, ReportUserFilter, createdBy, ...associations} = db.models.analysis_report.associations;

  beforeAll(async () => {
    // check that report exists
    const res = await request(server)
      .get(`/api/1.0/reports/${reportIdent}`)
      .auth(username, password)
      .type('json');

    expect(res.status).toBe(200);

    // get report id from patient info. because it's excluded in public view
    reportId = res.body.patientInformation.report_id;

    const modelNames = [];
    const promises = [];

    // get all current associations of the report and store
    // the ids of them in the currentComponents object
    Object.values(associations).forEach(async (association) => {
      const model = association.target.name;
      modelNames.push(model);
      promises.push(db.models[model].findAll({where: {report_id: reportId}}));
    });

    const results = await Promise.all(promises);

    // parse all associated sections of report
    results.forEach((models, i) => {
      const modelName = modelNames[i];

      // add empty array of component ids
      currentComponents[modelName] = [];

      // add ids of all model components
      models.forEach((model) => {
        currentComponents[modelName].push(model.id);
      });
    });
  });

  // Test paranoid report delete that cascade's
  test('Test paranoid report delete', async () => {
    // delete the report
    let res = await request(server)
      .delete(`/api/1.0/reports/${reportIdent}`)
      .auth(username, password)
      .type('json')
      .expect(204);


    // verify report is deleted
    res = await request(server)
      .get(`/api/1.0/reports/${reportIdent}`)
      .auth(username, password)
      .type('json')
      .expect(404);


    // verify report components are also soft deleted
    Object.values(associations).forEach(async (association) => {
      const model = association.target.name;
      const results = await db.models[model].findAll({where: {report_id: reportId}});
      // results should be an empty array
      expect(results).toEqual([]);

    });
  });

  // Restore report and all of its deleted components
  afterAll(async () => {
    // restore report
    await db.models.analysis_report.restore({where: {id: reportId}});

    // verify report was restored
    const res = await request(server)
      .get(`/api/1.0/reports/${reportIdent}`)
      .auth(username, password)
      .type('json')
      .expect(200);


    // restore all report components
    const promises = [];
    Object.entries(currentComponents).forEach(([model, ids]) => {
      promises.push(db.models[model].restore({where: {id: {[Op.in]: ids}}}));
    });
    await Promise.all(promises);

    // verify all components are restored
    Object.entries(currentComponents).forEach(([model, ids]) => {
      ids.forEach(async (id) => {
        const result = await db.models[model].findOne({where: {id}});

        expect(typeof (result)).toBe('object');
        expect(result).not.toBeNull;
      });
    });
  });
});

afterAll(async () => {
  await server.close();
});
