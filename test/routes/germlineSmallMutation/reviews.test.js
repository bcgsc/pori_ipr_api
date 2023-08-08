const HTTP_STATUS = require('http-status-codes');
const supertest = require('supertest');
const getPort = require('get-port');
const db = require('../../../app/models');

const CONFIG = require('../../../app/config');
const {listen} = require('../../../app');

CONFIG.set('env', 'test');
const {username, password} = CONFIG.get('testing');

let server;
let request;
let testUser;

const CREATE_DATA = {
  type: 'Test Type',
  comment: 'Test Comment',
};
const NEW_CREATE_DATA = {
  type: 'New Test Type',
  comment: 'New Test Comment',
};
const UPDATE_DATA = {
  type: 'Updated Type',
  comment: 'Updated Comment',
};

const germlineReviewProperties = [
  'ident', 'createdAt', 'updatedAt', 'type', 'comment', 'reviewer',
];

const checkGermlineReview = (reviewObject) => {
  germlineReviewProperties.forEach((element) => {
    expect(reviewObject).toHaveProperty(element);
  });
  expect(reviewObject).toEqual(expect.not.objectContaining({
    id: expect.any(Number),
    germlineReportId: expect.any(Number),
    deletedAt: expect.any(String),
  }));
};

// Start API
beforeAll(async () => {
  const port = await getPort({port: CONFIG.get('web:port')});
  server = await listen(port);
  request = supertest(server);

  // get test user
  testUser = await db.models.user.findOne({
    where: {username},
  });
});

describe('/germline-small-mutation-reports/:gsm_report/reviews', () => {
  let report;
  let review;
  let BASE_URI;

  beforeAll(async () => {
    // Create a user to be used
    // create a report to be used in tests
    report = await db.models.germlineSmallMutation.create({
      sourceVersion: 'v1.0.0',
      sourcePath: '/some/random/source/path',
      biofxAssignedId: testUser.id,
      exported: false,
      patientId: 'TESTPAT01',
      biopsyName: 'TEST123',
    });

    BASE_URI = `/api/germline-small-mutation-reports/${report.ident}/reviews`;

    // Create initial review data
    review = await db.models.germlineSmallMutationReview.create({...CREATE_DATA, reviewerId: testUser.id, germlineReportId: report.id});
  });

  describe('GET', () => {
    test('/ - 200 Success', async () => {
      const res = await request
        .get(BASE_URI)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);

      const [entry] = res.body;

      checkGermlineReview(entry);

      expect(entry).toEqual(expect.objectContaining(CREATE_DATA));
    });

    test('/{review} - 200 Success', async () => {
      const res = await request
        .get(`${BASE_URI}/${review.ident}`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      checkGermlineReview(res.body);
      expect(res.body).toEqual(expect.objectContaining(CREATE_DATA));
    });
  });

  describe('POST', () => {
    test('/ - 201 Created', async () => {
      const res = await request
        .post(BASE_URI)
        .send(NEW_CREATE_DATA)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.CREATED);

      checkGermlineReview(res.body);
      expect(res.body).toEqual(expect.objectContaining(NEW_CREATE_DATA));

      // Check that record was created in the db
      const result = await db.models.germlineSmallMutationReview.findOne({where: {ident: res.body.ident}});
      expect(result).not.toBeNull();
    });
  });

  describe('PUT', () => {
    let germlineReviewUpdate;

    beforeEach(async () => {
      germlineReviewUpdate = await db.models.germlineSmallMutationReview.create({
        ...CREATE_DATA, reviewerId: testUser.id, germlineReportId: report.id,
      });
    });

    afterEach(async () => {
      await db.models.germlineSmallMutationReview.destroy({where: {ident: germlineReviewUpdate.ident}, force: true});
    });

    test('/{review} - 200 Success', async () => {
      const res = await request
        .put(`${BASE_URI}/${germlineReviewUpdate.ident}`)
        .send({...UPDATE_DATA, makeMeReviewer: true})
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      checkGermlineReview(res.body);
      expect(res.body).toEqual(expect.objectContaining(UPDATE_DATA));
    });

    test('/{review} - 400 Bad Request Failed Validation', async () => {
      await request
        .put(`${BASE_URI}/${germlineReviewUpdate.ident}`)
        .send({...UPDATE_DATA, id: 6})
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.BAD_REQUEST);
    });

    test('/{review} - 404 Not Found no review data to update', async () => {
      // First soft-delete record
      await db.models.germlineSmallMutationReview.destroy({where: {ident: germlineReviewUpdate.ident}});

      await request
        .put(`${BASE_URI}/${germlineReviewUpdate.ident}`)
        .send(UPDATE_DATA)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.NOT_FOUND);
    });
  });

  describe('DELETE', () => {
    let germlineReviewDelete;

    beforeEach(async () => {
      germlineReviewDelete = await db.models.germlineSmallMutationReview.create({
        ...CREATE_DATA, reviewerId: testUser.id, germlineReportId: report.id,
      });
    });

    afterEach(async () => {
      await db.models.germlineSmallMutationReview.destroy({
        where: {ident: germlineReviewDelete.ident}, force: true,
      });
    });

    test('/{review} - 204 No content', async () => {
      await request
        .delete(`${BASE_URI}/${germlineReviewDelete.ident}`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.NO_CONTENT);

      // Verify that the record was deleted
      const result = await db.models.germlineSmallMutationReview.findOne({where: {id: germlineReviewDelete.id}});

      expect(result).toBeNull();
    });

    test('/{review} - 404 Not Found no review data to delete', async () => {
      // First soft-delete record
      await db.models.germlineSmallMutationReview.destroy({where: {ident: germlineReviewDelete.ident}});

      await request
        .delete(`${BASE_URI}/${germlineReviewDelete.ident}`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.NOT_FOUND);
    });
  });

  // delete report
  afterAll(async () => {
    // delete newly created report and all of it's components
    // indirectly by hard deleting newly created patient
    await db.models.germlineSmallMutation.destroy({where: {ident: report.ident}, force: true});

    // verify report is deleted
    const result = await db.models.germlineSmallMutation.findOne({where: {ident: report.ident}, paranoid: false});
    expect(result).toBeNull();
  });
});

afterAll(async () => {
  global.gc && global.gc();
  await server.close();
});
