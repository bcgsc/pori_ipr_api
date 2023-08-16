process.env.NODE_ENV = 'test';

const supertest = require('supertest');
const getPort = require('get-port');
const {Op} = require('sequelize');
const db = require('../app/models');

// get test user info
const CONFIG = require('../app/config');
const {listen} = require('../app');

CONFIG.set('env', 'test');

const {username, password} = CONFIG.get('testing');

// created when running tests
const currentComponents = {};
let server;
let request;

// Start API
beforeAll(async () => {
  const port = await getPort({port: CONFIG.get('web:port')});
  server = await listen(port);
  request = supertest(server);
});

// Tests for deleting a report and all of its components
describe('Tests for deleting a report and all of its components', () => {
  let report;
  // get analysis report associations
  const {
    ReportUserFilter, createdBy, template, projects, users, ...associations
  } = db.models.report.associations;

  beforeAll(async () => {
    // find a report (any report not deleted)
    report = await db.models.report.findOne({
      attributes: ['ident', 'id'],
      where: {deletedAt: null},
    });
    const modelNames = [];
    const promises = [];

    // get all current associations of the report and store
    // the ids of them in the currentComponents object
    Object.values(associations).forEach(async (association) => {
      const model = association.target.name;
      modelNames.push(model);
      promises.push(db.models[model].findAll({where: {reportId: report.id}}));
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
  test('paranoid report delete', async () => {
    // delete the report
    await request
      .delete(`/api/reports/${report.ident}`)
      .auth(username, password)
      .type('json')
      .expect(204);

    // verify report is deleted
    await request
      .get(`/api/reports/${report.ident}`)
      .auth(username, password)
      .type('json')
      .expect(404);

    // verify report components are also soft deleted
    Object.values(associations).forEach(async (association) => {
      const model = association.target.name;
      const results = await db.models[model].findAll({where: {reportId: report.id}});
      // results should be an empty array
      expect(results).toEqual([]);
    });
  });

  // Restore report and all of its deleted components
  afterAll(async () => {
    // restore report
    await db.models.report.restore({where: {id: report.id}});

    // verify report was restored
    await request
      .get(`/api/reports/${report.ident}`)
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
        expect(result).not.toBe(null);
      });
    });
  });
});

afterAll(async () => {
  global.gc && global.gc();
  await server.close();
});
