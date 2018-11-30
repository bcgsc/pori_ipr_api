const chai = require('chai');
const supertest = require('supertest');
const testData = require('../../../setupTestData.js');
const db = require('../../../../app/models');

const {expect} = chai;
const api = supertest('http://localhost:8081');

let testReport;
let analystComment = {};

describe('Test analyst comments endpoints', () => {
  it('Should successfully create new analyst comments and record change history', async () => {
    const newComment = {
      comments: 'testingAnalystCommentsCreate',
    };

    const patient = await db.models.POG.findOne({where: {id: testReport.pog_id}});

    const res = await api.put(`/api/1.0/POG/${patient.POGID}/report/${testReport.ident}/genomic/summary/analystComments`)
      .set('Authorization', 'Basic bm1hcnRpbjooe31vKzBjTmY=')
      .send(newComment);

    analystComment = res.body;
    expect(res.status).to.equal(200);
    expect(analystComment.comments).to.equal(newComment.comments);

    // check that delete change history is the most recent to exist
    const opts = {
      where: {
        id: testReport.id,
        '$change_history.type$': 'create',
        '$change_history.entry_ident$': analystComment.ident,
      },
      include: [
        {as: 'change_history', model: db.models.change_history},
      ],
    };

    const report = await db.models.analysis_report.find(opts);
    const changeHistory = report.change_history[0];

    expect(changeHistory.model_name).to.equal('analystComments');
    expect(changeHistory.entry_ident).to.equal(analystComment.ident);
  });

  it('Should successfully update analyst comments and record change history', async () => {
    const patient = await db.models.POG.findOne({where: {id: testReport.pog_id}});

    const updateComments = {
      comments: 'testingAnalystCommentsUpdate',
      comment: 'testing analyst comments update',
    };

    const res = await api.put(`/api/1.0/POG/${patient.POGID}/report/${testReport.ident}/genomic/summary/analystComments`)
      .set('Authorization', 'Basic bm1hcnRpbjooe31vKzBjTmY=')
      .send(updateComments);

    analystComment = res.body;
    expect(res.status).to.equal(200);
    expect(analystComment.comments).to.equal(updateComments.comments);

    // check that delete change history is the most recent to exist
    const opts = {
      where: {
        id: testReport.id,
        '$change_history.type$': 'update',
        '$change_history.entry_ident$': analystComment.ident,
      },
      include: [
        {as: 'change_history', model: db.models.change_history},
      ],
    };

    const report = await db.models.analysis_report.find(opts);
    const changeHistory = report.change_history[0];

    expect(changeHistory.model_name).to.equal('analystComments');
    expect(changeHistory.entry_ident).to.equal(analystComment.ident);
    expect(changeHistory.comment).to.equal(updateComments.comment);
  });

  before(async () => {
    // create test report
    testReport = await testData.createTestReport('genomic');
  });

  after(async () => {
    // delete change history created in testing
    await db.models.change_history.destroy({where: {entry_ident: analystComment.ident}});
    // delete test patient (should cascade and delete all associations)
    await db.models.POG.destroy({where: {id: testReport.pog_id}, force: true});
  });
});
