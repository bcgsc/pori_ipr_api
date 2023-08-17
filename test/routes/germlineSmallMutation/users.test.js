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

const checkGermlineUser = (germlineUserObject) => {
  expect(germlineUserObject).toEqual(expect.objectContaining({
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
  expect(germlineUserObject).toEqual(expect.not.objectContaining({
    id: expect.any(Number),
    germlineReportId: expect.any(Number),
    user_id: expect.any(Number),
    addedById: expect.any(Number),
    updatedBy: expect.any(Number),
    deletedAt: expect.any(String),
  }));
};

const checkGermlineUsers = (germlineUsers) => {
  germlineUsers.forEach((germlineUser) => {
    checkGermlineUser(germlineUser);
  });
};

// Start API
beforeAll(async () => {
  const port = await getPort({port: CONFIG.get('web:port')});
  server = await listen(port);
  request = supertest(server);
});

describe('/germline-small-mutation-reports/{gsm_report}/users', () => {
  let user;
  let report;
  let createUser;
  let germlineUserBinding;

  beforeAll(async () => {
    // Get test user
    user = await db.models.user.findOne({where: {username}});

    // create a germline report to be used in tests
    report = await db.models.germlineSmallMutation.create({
      patientId: 'PATIENT1234',
      biopsyName: 'TEST BIOPSY NAME',
      sourceVersion: 'TEST VERSION',
      sourcePath: 'TEST SOURCE PATH',
      biofxAssignedId: user.id,
    });

    createUser = await db.models.user.create({
      username: uuidv4(),
      type: 'bcgsc',
      firstName: 'germlineUserFirstName',
      lastName: 'germlineUserLastName',
      email: 'fake@email.com',
    });

    germlineUserBinding = await db.models.germlineReportUser.create({
      user_id: createUser.id,
      germlineReportId: report.id,
      role: 'clinician',
      addedById: user.id,
    });
  });

  describe('GET', () => {
    test('/ - 200 Success', async () => {
      const res = await request
        .get(`/api/germline-small-mutation-reports/${report.ident}/users`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      checkGermlineUsers(res.body);
    });

    test('/{germlineReportUser} - 200 Success', async () => {
      const res = await request
        .get(`/api/germline-small-mutation-reports/${report.ident}/users/${germlineUserBinding.ident}`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      checkGermlineUser(res.body);
    });

    test('/{germlineReportUser} - 404 Not Found - Binding does not exist', async () => {
      await request
        .post(`/api/germline-small-mutation-reports/${report.ident}/users/${uuidv4()}`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.NOT_FOUND);
    });
  });

  describe('POST', () => {
    test('/ - 201 Created', async () => {
      await request
        .post(`/api/germline-small-mutation-reports/${report.ident}/users`)
        .send({user: createUser.ident, role: 'bioinformatician'})
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.CREATED);

      // Find created binding
      const binding = await db.models.germlineReportUser.findOne({
        where: {germlineReportId: report.id, user_id: createUser.id, role: 'bioinformatician'},
      });
      expect(binding).not.toBeNull();
      expect(binding.deletedAt).toBeNull();

      // Delete binding
      await db.models.germlineReportUser.destroy({where: {ident: binding.ident}, force: true});
    });

    test('/ - 400 Bad Request - Invalid user', async () => {
      await request
        .post(`/api/germline-small-mutation-reports/${report.ident}/users`)
        .send({user: 'INVALID_UUID', role: 'clinician'})
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.BAD_REQUEST);
    });

    test('/ - 400 Bad Request - Missing user', async () => {
      await request
        .post(`/api/germline-small-mutation-reports/${report.ident}/users`)
        .send({role: 'clinician'})
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.BAD_REQUEST);
    });

    test('/ - 400 Bad Request - Missing role', async () => {
      await request
        .post(`/api/germline-small-mutation-reports/${report.ident}/users`)
        .send({user: createUser.ident})
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.BAD_REQUEST);
    });

    test('/ - 404 Not Found - User not found', async () => {
      await request
        .post(`/api/germline-small-mutation-reports/${report.ident}/users`)
        .send({user: uuidv4(), role: 'clinician'})
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.NOT_FOUND);
    });

    test('/ - 409 Conflict - Binding already exists', async () => {
      // Create binding
      const binding = await db.models.germlineReportUser.create({
        user_id: createUser.id,
        germlineReportId: report.id,
        role: 'clinician',
        addedById: user.id,
      });

      await request
        .post(`/api/germline-small-mutation-reports/${report.ident}/users`)
        .send({user: createUser.ident, role: 'clinician'})
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.CONFLICT);

      // Destroy binding
      await db.models.germlineReportUser.destroy({where: {ident: binding.ident}, force: true});
    });
  });

  describe('DELETE', () => {
    let deleteBinding;

    beforeEach(async () => {
      deleteBinding = await db.models.germlineReportUser.create({
        user_id: createUser.id,
        germlineReportId: report.id,
        role: 'analyst',
        addedById: user.id,
      });
    });

    afterEach(async () => {
      return db.models.germlineReportUser.destroy({
        where: {ident: deleteBinding.ident}, force: true,
      });
    });

    test('/{germlineReportUser} - 204 No content', async () => {
      await request
        .delete(`/api/germline-small-mutation-reports/${report.ident}/users/${deleteBinding.ident}`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.NO_CONTENT);

      // Verify that the record was soft-deleted
      const result = await db.models.germlineReportUser.findOne({
        where: {ident: deleteBinding.ident}, paranoid: false,
      });
      expect(result.deletedAt).not.toBeNull();
    });

    test('/{germlineReportUser} - 404 Not Found - Binding does not exist', async () => {
      await request
        .delete(`/api/germline-small-mutation-reports/${report.ident}/users/${uuidv4()}`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.NOT_FOUND);
    });
  });

  // delete report
  afterAll(async () => {
    // delete test germline report
    return db.models.germlineSmallMutation.destroy({where: {ident: report.ident}, force: true});
  });
});

afterAll(async () => {
  global.gc && global.gc();
  await server.close();
});
