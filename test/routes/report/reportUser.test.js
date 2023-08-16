const HTTP_STATUS = require('http-status-codes');
const supertest = require('supertest');
const getPort = require('get-port');
const {v4: uuidv4} = require('uuid');

const db = require('../../../app/models');
const CONFIG = require('../../../app/config');
const {listen} = require('../../../app');

CONFIG.set('env', 'test');
const {username, password} = CONFIG.get('testing');

let server;
let request;

const checkReportUser = (reportUserObject) => {
  expect(reportUserObject).toEqual(expect.objectContaining({
    ident: expect.any(String),
    createdAt: expect.any(String),
    updatedAt: expect.any(String),
    role: expect.any(String),
    user: expect.objectContaining({
      ident: expect.any(String),
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
      username: expect.any(String),
      type: expect.any(String),
      firstName: expect.any(String),
      lastName: expect.any(String),
      email: expect.any(String),
    }),
  }));
  expect(reportUserObject).toEqual(expect.not.objectContaining({
    id: expect.any(Number),
    reportId: expect.any(Number),
    user_id: expect.any(Number),
    addedBy_id: expect.any(Number),
    deletedAt: expect.any(String),
  }));
};

const checkReportUsers = (reportUsers) => {
  reportUsers.forEach((reportUser) => {
    checkReportUser(reportUser);
  });
};

// Start API
beforeAll(async () => {
  const port = await getPort({port: CONFIG.get('web:port')});
  server = await listen(port);
  request = supertest(server);
});

describe('/reports/{REPORTID}/user', () => {
  let user;
  let report;
  let createUser;
  let userReportBinding;

  beforeAll(async () => {
    // Get genomic template
    const template = await db.models.template.findOne({where: {name: 'genomic'}});
    // create a report to be used in tests
    report = await db.models.report.create({
      templateId: template.id,
      patientId: 'PATIENT1234',
    });

    user = await db.models.user.findOne({where: {username}});

    createUser = await db.models.user.create({
      username: uuidv4(),
      type: 'bcgsc',
      firstName: 'reportUserFirstName',
      lastName: 'reportUserLastName',
      email: 'fake@email.com',
    });

    userReportBinding = await db.models.reportUser.create({
      user_id: createUser.id,
      reportId: report.id,
      role: 'clinician',
      addedBy_id: user.id,
    });
  });

  describe('GET', () => {
    test('/ - 200 Success', async () => {
      const res = await request
        .get(`/api/reports/${report.ident}/user`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      checkReportUsers(res.body);
    });

    test('/{reportUser} - 200 Success', async () => {
      const res = await request
        .get(`/api/reports/${report.ident}/user/${userReportBinding.ident}`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      checkReportUser(res.body);
    });

    test('/{reportUser} - 404 Not Found - Binding does not exist', async () => {
      await request
        .post(`/api/reports/${report.ident}/user/${uuidv4()}`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.NOT_FOUND);
    });
  });

  describe('POST', () => {
    test('/ - 201 Created', async () => {
      await request
        .post(`/api/reports/${report.ident}/user`)
        .send({user: createUser.ident, role: 'bioinformatician'})
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.CREATED);

      // Find created binding
      const binding = await db.models.reportUser.findOne({
        where: {reportId: report.id, user_id: createUser.id, role: 'bioinformatician'},
      });
      expect(binding).not.toBeNull();
      expect(binding.deletedAt).toBeNull();

      // Delete binding
      await db.models.reportUser.destroy({where: {ident: binding.ident}, force: true});
    });

    test('/ - 400 Bad Request - Invalid user', async () => {
      await request
        .post(`/api/reports/${report.ident}/user`)
        .send({user: 'INVALID_UUID', role: 'clinician'})
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.BAD_REQUEST);
    });

    test('/ - 400 Bad Request - Missing user', async () => {
      await request
        .post(`/api/reports/${report.ident}/user`)
        .send({role: 'clinician'})
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.BAD_REQUEST);
    });

    test('/ - 400 Bad Request - Missing role', async () => {
      await request
        .post(`/api/reports/${report.ident}/user`)
        .send({user: createUser.ident})
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.BAD_REQUEST);
    });

    test('/ - 404 Not Found - User not found', async () => {
      await request
        .post(`/api/reports/${report.ident}/user`)
        .send({user: uuidv4(), role: 'clinician'})
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.NOT_FOUND);
    });

    test('/ - 409 Conflict - Binding already exists', async () => {
      // Create binding
      const binding = await db.models.reportUser.create({
        user_id: createUser.id,
        reportId: report.id,
        role: 'clinician',
        addedBy_id: user.id,
      });

      await request
        .post(`/api/reports/${report.ident}/user`)
        .send({user: createUser.ident, role: 'clinician'})
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.CONFLICT);

      // Destroy binding
      await db.models.reportUser.destroy({where: {ident: binding.ident}, force: true});
    });
  });

  describe('DELETE', () => {
    let deleteBinding;

    beforeEach(async () => {
      deleteBinding = await db.models.reportUser.create({
        user_id: createUser.id,
        reportId: report.id,
        role: 'analyst',
        addedBy_id: user.id,
      });
    });

    afterEach(async () => {
      return db.models.reportUser.destroy({
        where: {ident: deleteBinding.ident}, force: true,
      });
    });

    test('/{reportUser} - 204 No content', async () => {
      await request
        .delete(`/api/reports/${report.ident}/user/${deleteBinding.ident}`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.NO_CONTENT);

      // Verify that the record was soft-deleted
      const result = await db.models.reportUser.findOne({
        where: {ident: deleteBinding.ident}, paranoid: false,
      });
      expect(result.deletedAt).not.toBeNull();
    });

    test('/{reportUser} - 404 Not Found - Binding does not exist', async () => {
      await request
        .delete(`/api/reports/${report.ident}/user/${uuidv4()}`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.NOT_FOUND);
    });
  });

  // delete report
  afterAll(async () => {
    // delete newly created report and all of it's components
    // indirectly by hard deleting newly created patient
    await db.models.report.destroy({where: {ident: report.ident}, force: true});
  });
});

afterAll(async () => {
  global.gc && global.gc();
  await server.close();
});
