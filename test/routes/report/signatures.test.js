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

const signatureProperties = ['ident', 'createdAt', 'updatedAt', 'username', 'type', 'firstName', 'lastName', 'email'];
// Properties of res.body.reviewerSignature, res.body.creatorSignature and res.body.authorSignature
const checkSignatureProperties = (signature) => {
  // Function for checking reviewer, creator and author signatures
  signatureProperties.forEach((property) => {
    expect(signature).toHaveProperty(property);
  });
};

// Start API
beforeAll(async () => {
  const port = await getPort({port: CONFIG.get('web:port')});
  server = await listen(port);
  request = supertest(server);
});

describe('/reports/{REPORTID}/signatures', () => {
  let report;
  let user;

  beforeAll(async () => {
    // Get genomic template
    const template = await db.models.template.findOne({where: {name: 'genomic'}});
    // create a report to be used in tests
    // TODO: Update report upload to report mocking once metadata is simplified
    // const project = await db.models.project.findOne(); // any project is fine
    report = await db.models.report.create({
      templateId: template.id,
      patientId: 'PATIENT1234',
    });

    user = await db.models.user.findOne({
      where: {username},
    });
  });

  describe('GET', () => {
    let signature;

    beforeEach(async () => {
      signature = await db.models.signatures.create({
        reportId: report.id,
        authorId: user.id,
        authorSignedAt: new Date(),
      });
    });

    afterEach(async () => {
      return signature.destroy({force: true});
    });

    test('/ - 200 Success', async () => {
      const res = await request
        .get(`/api/reports/${report.ident}/signatures`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      const {body: {reviewerSignature, authorSignature}} = res;
      expect(res.body).toEqual(expect.objectContaining({
        ident: expect.any(String),
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
        reviewerSignature: expect.any(Object),
        authorSignature: expect.any(Object),
        creatorSignature: expect.any(Object),
      }));
      expect(res.body).toHaveProperty('reviewerSignedAt');
      expect(res.body).toHaveProperty('authorSignedAt');
      expect(res.body).toHaveProperty('creatorSignedAt');
      expect(reviewerSignature).toBe(null);
      checkSignatureProperties(authorSignature);

      // check that an author was added and a reviewer and creator weren't
      expect(res.body).toEqual(expect.objectContaining({
        ident: expect.any(String),
        authorSignedAt: expect.any(String),
        reviewerSignedAt: null,
        creatorSignedAt: null,
      }));
    });

    test('/earliest-signoff - 200 Success', async () => {
      // Add reviewer signature to complete
      await signature.update({
        reviewerId: user.id,
        reviewerSignedAt: new Date(),
        creatorId: user.id,
        creatorSignedAt: new Date(),
      });

      const res = await request
        .get(`/api/reports/${report.ident}/signatures/earliest-signoff`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      expect(res.body).not.toBeNull();

      expect(res.body).toEqual(expect.objectContaining({
        ident: expect.any(String),
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
        reviewerSignedAt: expect.any(String),
        authorSignedAt: expect.any(String),
        creatorSignedAt: expect.any(String),
        reviewerSignature: expect.any(Object),
        authorSignature: expect.any(Object),
        creatorSignature: expect.any(Object),
        signedOffOn: expect.any(String),
      }));
      expect(res.body).toEqual(expect.not.objectContaining({
        id: expect.any(Number),
        reportId: expect.any(Number),
        updatedBy: expect.any(Number),
        deletedAt: expect.any(String),
      }));
      expect(res.body.signedOffOn).toBe(res.body.updatedAt);
    });

    test('/earliest-signoff - 404 Not Found', async () => {
      await request
        .get(`/api/reports/${report.ident}/signatures/earliest-signoff`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.NOT_FOUND);
    });
  });

  describe('PUT', () => {
    // Tests for PUT endpoints
    describe('Tests for adding a signature', () => {
      // Tests for adding a signature
      test('PUT /sign/author - 200 Success', async () => {
        const res = await request
          .put(`/api/reports/${report.ident}/signatures/sign/author`)
          .auth(username, password)
          .type('json')
          .expect(HTTP_STATUS.OK);

        expect(res.body).toEqual(expect.objectContaining({
          ident: expect.any(String),
          authorSignedAt: expect.any(String),
        }));
      });

      test('PUT /sign/reviewer - 200 Success', async () => {
        const res = await request
          .put(`/api/reports/${report.ident}/signatures/sign/reviewer`)
          .auth(username, password)
          .type('json')
          .expect(HTTP_STATUS.OK);

        expect(res.body).toEqual(expect.objectContaining({
          ident: expect.any(String),
          reviewerSignedAt: expect.any(String),
        }));
      });

      test('PUT /sign/creator - 200 Success', async () => {
        const res = await request
          .put(`/api/reports/${report.ident}/signatures/sign/creator`)
          .auth(username, password)
          .type('json')
          .expect(HTTP_STATUS.OK);

        expect(res.body).toEqual(expect.objectContaining({
          ident: expect.any(String),
          creatorSignedAt: expect.any(String),
        }));
      });

      test('PUT /sign/INVALID - 404 Not Found', async () => {
        await request
          .put(`/api/reports/${report.ident}/signatures/sign/NOT_EXISTENT_ROLE`)
          .auth(username, password)
          .type('json')
          .expect(HTTP_STATUS.NOT_FOUND);
      });
    });

    describe('Test revoking signatures', () => {
      // Tests for revoking signatures and invalid inputs
      test('PUT /revoke/author - 200 Success', async () => {
        const res = await request
          .put(`/api/reports/${report.ident}/signatures/revoke/author`)
          .auth(username, password)
          .type('json')
          .expect(HTTP_STATUS.OK);

        expect(res.body).toEqual(expect.objectContaining({
          ident: expect.any(String),
          authorSignedAt: null,
        }));
      });

      test('PUT /revoke/reviewer - 200 Success', async () => {
        const res = await request
          .put(`/api/reports/${report.ident}/signatures/revoke/reviewer`)
          .auth(username, password)
          .type('json')
          .expect(HTTP_STATUS.OK);

        expect(res.body).toEqual(expect.objectContaining({
          ident: expect.any(String),
          reviewerSignedAt: null,
        }));
      });

      test('PUT /revoke/creator - 200 Success', async () => {
        const res = await request
          .put(`/api/reports/${report.ident}/signatures/revoke/creator`)
          .auth(username, password)
          .type('json')
          .expect(HTTP_STATUS.OK);

        expect(res.body).toEqual(expect.objectContaining({
          ident: expect.any(String),
          creatorSignedAt: null,
        }));
      });

      test('PUT /revoke/INVALID - 404 Not Found', async () => {
        await request
          .put(`/api/reports/${report.ident}/signatures/revoke/NOT_EXISTENT_ROLECLEAR`)
          .auth(username, password)
          .type('json')
          .expect(HTTP_STATUS.NOT_FOUND);
      });
    });
  });

  afterAll(async () => {
    // Delete newly created report and all of it's components
    // indirectly by force deleting the report
    return db.models.report.destroy({where: {ident: report.ident}, force: true});
  });
});

afterAll(async () => {
  global.gc && global.gc();
  await server.close();
});

describe('/reports/{REPORTID}/summary/analyst-comments with signatures', () => {
  let report;
  let user;
  let analystComments;

  beforeAll(async () => {
    // Get genomic template
    const template = await db.models.template.findOne({where: {name: 'genomic'}});
    // create a report to be used in tests
    report = await db.models.report.create({
      templateId: template.id,
      patientId: 'PATIENT1234',
    });

    user = await db.models.user.findOne({
      where: {username},
    });

    analystComments = await db.models.analystComments.create({
      comments: 'test_comment',
      reportId: report.id,
    });

    // Create initial comment to be tested
    await request
      .put(`/api/reports/${report.ident}/summary/analyst-comments`)
      .auth(username, password)
      .type('json')
      .send({comments: 'This is the first comment'})
      .expect(200);
  });

  describe('PUT', () => {
    // Tests for PUT endpoints
    let signature;

    beforeEach(async () => {
      signature = await db.models.signatures.create({
        reportId: report.id,
        authorId: user.id,
        authorSignedAt: new Date(),
        creatorId: user.id,
        creatorSignedAt: new Date(),
        reviewerId: user.id,
        reviewerSignedAt: new Date(),
      });
    });

    test('PUT / comment - 200 Success Creator Signature is not Removed', async () => {
      const initialSignature = await request
        .get(`/api/reports/${report.ident}/signatures`)
        .auth(username, password)
        .type('json')
        .expect(200);

      expect(initialSignature.body).toEqual(expect.objectContaining({
        ident: expect.any(String),
        authorSignedAt: expect.any(String),
        creatorSignedAt: expect.any(String),
        reviewerSignedAt: expect.any(String),
      }));

      const res = await request
        .put(`/api/reports/${report.ident}/summary/analyst-comments`)
        .auth(username, password)
        .type('json')
        .send({comments: 'This is another comment'})
        .expect(200);

      expect(res.body).toEqual(expect.objectContaining({
        ident: expect.any(String),
        comments: 'This is another comment',
      }));

      const postEditSignature = await request
        .get(`/api/reports/${report.ident}/signatures`)
        .auth(username, password)
        .type('json')
        .expect(200);

      expect(postEditSignature.body).toEqual(expect.objectContaining({
        ident: expect.any(String),
        authorSignedAt: null,
        reviewerSignedAt: null,
        creatorSignedAt: expect.any(String),
      }));
    });

    afterEach(async () => {
      return signature.destroy({force: true});
    });
  });

  afterAll(async () => {
    // Delete newly created report and all of it's components
    // indirectly by force deleting the report
    db.models.report.destroy({where: {ident: report.ident}, force: true});
    return db.models.analystComments.destroy({where: {ident: analystComments.ident}, force: true});
  });
});
