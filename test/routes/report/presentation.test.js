const HTTP_STATUS = require('http-status-codes');

const supertest = require('supertest');
const getPort = require('get-port');
const db = require('../../../app/models');

const mockReportData = require('../../testData/mockReportData.json');

const CONFIG = require('../../../app/config');
const {listen} = require('../../../app');

CONFIG.set('env', 'test');

const {username, password} = CONFIG.get('testing');

const LONGER_TIMEOUT = 50000;

let server;
let request;

// TODO:
// Error tests

// Start API
beforeAll(async () => {
  const port = await getPort({port: CONFIG.get('web:port')});
  server = await listen(port);
  request = supertest(server);
});

describe('/reports/{REPORTID}/presentation/discussion', () => {
  let report;
  let discussion;
  let user;

  const discussionObject = {
    ident: expect.any(String),
    createdAt: expect.any(String),
    updatedAt: expect.any(String),
    body: expect.any(String),
    user: expect.any(Object),
  };

  beforeAll(async () => {
    // Create Report and discussion
    report = await db.models.analysis_report.create({
      patientId: mockReportData.patientId,
    });
    user = await db.models.user.findOne({
      where: {username},
    });
    discussion = await db.models.presentation_discussion.create({
      reportId: report.id,
      body: 'Patient is currently stable and maintained on Flourouracil + Irinotecan + Bevacizumab. The highly expressed TOP1 may explain the good response to this therapy.',
      user_id: user.id,
    });
  }, LONGER_TIMEOUT);

  describe('GET', () => {
    test('Getting a list of discussions is ok', async () => {
      const res = await request
        .get(`/api/reports/${report.ident}/presentation/discussion`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      expect(res.body).toEqual(expect.arrayContaining([
        expect.objectContaining(discussionObject),
      ]));

      expect(res.body).not.toHaveProperty('id');
      expect(res.body).not.toHaveProperty('reportId');
      expect(res.body).not.toHaveProperty('user_id');
      expect(res.body).not.toHaveProperty('deletedAt');
    });

    test('Getting a specific discussion is ok', async () => {
      const res = await request
        .get(`/api/reports/${report.ident}/presentation/discussion/${discussion.ident}`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      expect(res.body).toEqual(expect.objectContaining(discussionObject));
    });
  });

  describe('POST', () => {
    test('Creating a new valid discussion is ok', async () => {
      const bodyText = 'The highly expressed TOP1 may explain the good response to this therapy.';
      const res = await request
        .post(`/api/reports/${report.ident}/presentation/discussion`)
        .send({
          body: bodyText,
        })
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.CREATED);

      expect(res.body).toEqual(expect.objectContaining(discussionObject));
      expect(res.body.body).toEqual(bodyText);

      expect(res.body).not.toHaveProperty('id');
      expect(res.body).not.toHaveProperty('reportId');
      expect(res.body).not.toHaveProperty('user_id');
      expect(res.body).not.toHaveProperty('deletedAt');
    });

    test.todo('add tests after validation');
  });

  describe('PUT', () => {
    test('Updating a discussion is ok', async () => {
      const bodyText = 'Patient is currently stable and maintained on Flourouracil + Irinotecan + Bevacizumab.';
      const res = await request
        .put(`/api/reports/${report.ident}/presentation/discussion/${discussion.ident}`)
        .send({
          body: bodyText,
        })
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      expect(res.body).toEqual(expect.objectContaining(discussionObject));
      expect(res.body.body).toEqual(bodyText);
    });

    test.todo('add tests after validation');
  });

  describe('DELETE', () => {
    test('Deleting a discussion is ok', async () => {
      const deleteDiscussion = await db.models.presentation_discussion.create({
        reportId: report.id,
        body: 'The use of erlotinib could be considered despite the presence of a gain of function KRAS mutant. This mutation is suspected to be subclonal and the GRB2 mutation is a variant of unknown significance and unknown functionality',
        user_id: user.id,
      });

      await request
        .delete(`/api/reports/${report.ident}/presentation/discussion/${deleteDiscussion.ident}`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.NO_CONTENT);
    });
  });

  // delete report
  afterAll(async () => {
    await db.models.analysis_report.destroy({where: {id: report.id}, force: true});
  }, LONGER_TIMEOUT);
});

describe('/reports/{REPORTID}/presentation/slide', () => {
  let report;
  let slide;
  let user;

  const slideObject = {
    ident: expect.any(String),
    createdAt: expect.any(String),
    updatedAt: expect.any(String),
    name: expect.any(String),
    object: expect.any(String),
    object_type: expect.any(String),
    user: expect.any(Object),
  };

  beforeAll(async () => {
    // Create Report and discussion
    report = await db.models.analysis_report.create({
      patientId: mockReportData.patientId,
    });
    user = await db.models.user.findOne({
      where: {username},
    });
    slide = await db.models.presentation_slides.create({
      reportId: report.id,
      user_id: user.id,
      name: 'NOTCH1 mutations',
      object: 'iVBORw0KGgoAAAANSUhEUgAADDAAAALBCAYAAAAUSbDVAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAA',
      object_type: 'image/png',
    });
  }, LONGER_TIMEOUT);

  describe('GET', () => {
    test('Getting a list of slides is ok', async () => {
      const res = await request
        .get(`/api/reports/${report.ident}/presentation/slide`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      expect(res.body).toEqual(expect.arrayContaining([
        expect.objectContaining(slideObject),
      ]));
    });

    test('Getting a specific slide is ok', async () => {
      const res = await request
        .get(`/api/reports/${report.ident}/presentation/slide/${slide.ident}`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.OK);

      expect(res.body).toEqual(expect.objectContaining(slideObject));

      expect(res.body).not.toHaveProperty('id');
      expect(res.body).not.toHaveProperty('reportId');
      expect(res.body).not.toHaveProperty('user_id');
      expect(res.body).not.toHaveProperty('deletedAt');
    });
  });

  describe('POST', () => {
    test('Creating a new valid slide is ok', async () => {
      const nameText = 'the Role of HERC2';
      const res = await request
        .post(`/api/reports/${report.ident}/presentation/slide`)
        .field('name', nameText)
        .attach('file', 'test/testData/images/golden.jpg')
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.CREATED);

      expect(res.body).toEqual(expect.objectContaining(slideObject));
      expect(res.body.name).toEqual(nameText);

      expect(res.body).not.toHaveProperty('id');
      expect(res.body).not.toHaveProperty('reportId');
      expect(res.body).not.toHaveProperty('user_id');
      expect(res.body).not.toHaveProperty('deletedAt');
    });

    test.todo('add tests after validation');
  });

  describe('DELETE', () => {
    test('Deleting a slide is ok', async () => {
      const deleteSlide = await db.models.presentation_slides.create({
        reportId: report.id,
        user_id: user.id,
        name: 'NOTCH2 mutations',
        object: 'iVBORw0KGgoAAAANSUhEUgAADDAAAALBCAYAAAAUSbDVAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAA2',
        object_type: 'image/png',
      });

      await request
        .delete(`/api/reports/${report.ident}/presentation/slide/${deleteSlide.ident}`)
        .auth(username, password)
        .type('json')
        .expect(HTTP_STATUS.NO_CONTENT);
    });
  });

  // delete report
  afterAll(async () => {
    await db.models.analysis_report.destroy({where: {id: report.id}, force: true});
  }, LONGER_TIMEOUT);
});

afterAll(async () => {
  await server.close();
});
