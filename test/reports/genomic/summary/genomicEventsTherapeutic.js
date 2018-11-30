const chai = require('chai');
const supertest = require('supertest');
const testData = require('../../../setupTestData.js');
const db = require('../../../../app/models');

const {expect} = chai;
const api = supertest('http://localhost:8081');

let testReport;
let event = {};

describe('Test genomic events therapeutic in genomic report endpoints', () => {
  it('Should successfully update a genomic therapeutic event and record change history', async () => {
    const patient = await db.models.POG.findOne({where: {id: testReport.pog_id}});

    const updateEvent = {
      genomicEvent: 'testingGenomicEventsTherapeuticUpdate',
      comment: 'testing genomic events therapeutic update',
    };

    const res = await api.put(`/api/1.0/POG/${patient.POGID}/report/${testReport.ident}/genomic/summary/genomicEventsTherapeutic/${event.ident}`)
      .set('Authorization', 'Basic bm1hcnRpbjooe31vKzBjTmY=')
      .send(updateEvent);

    event = res.body;
    expect(res.status).to.equal(200);
    expect(event.geneVariant).to.equal(updateEvent.geneVariant);

    // check that delete change history is the most recent to exist
    const opts = {
      where: {
        id: testReport.id,
        '$change_history.type$': 'update',
        '$change_history.entry_ident$': event.ident,
      },
      include: [
        {as: 'change_history', model: db.models.change_history},
      ],
    };

    const report = await db.models.analysis_report.find(opts);
    const changeHistory = report.change_history[0];

    expect(changeHistory.model_name).to.equal('genomicEventsTherapeutic');
    expect(changeHistory.entry_ident).to.equal(event.ident);
    expect(changeHistory.comment).to.equal(updateEvent.comment);
  });

  it('Should successfully delete a genomic therapeutic event and record change history', async () => {
    const patient = await db.models.POG.findOne({where: {id: testReport.pog_id}});

    const deleteEvent = {
      comment: 'testing genomic events therapeutic delete',
    };

    const res = await api.delete(`/api/1.0/POG/${patient.POGID}/report/${testReport.ident}/genomic/summary/genomicEventsTherapeutic/${event.ident}`)
      .set('Authorization', 'Basic bm1hcnRpbjooe31vKzBjTmY=')
      .send(deleteEvent);

    const checkEventExists = await db.models.genomicEventsTherapeutic.findOne({where: {ident: event.ident}});

    expect(res.status).to.equal(200);
    expect(res.body.success).to.equal(true);
    expect(checkEventExists).to.equal(null);

    // check that delete change history is the most recent to exist
    const opts = {
      where: {
        id: testReport.id,
        '$change_history.type$': 'delete',
        '$change_history.entry_ident$': event.ident,
      },
      include: [
        {as: 'change_history', model: db.models.change_history},
      ],
    };

    const report = await db.models.analysis_report.find(opts);
    const changeHistory = report.change_history[0];

    expect(changeHistory.model_name).to.equal('genomicEventsTherapeutic');
    expect(changeHistory.entry_ident).to.equal(event.ident);
    expect(changeHistory.comment).to.equal(deleteEvent.comment);
    expect(changeHistory.deleted_content).to.not.equal(null);
  });

  before(async () => {
    // create test report
    testReport = await testData.createTestReport('genomic');

    // create test genomic therapeutic event
    const newEvent = {
      genomicEvent: 'aTestGenomicTherapeuticEvent',
      pog_report_id: testReport.id,
      pog_id: testReport.pog_id,
    };
    event = await db.models.genomicEventsTherapeutic.create(newEvent);
  });

  after(async () => {
    // delete change history created in testing
    await db.models.change_history.destroy({where: {entry_ident: event.ident}});
    // delete test patient (should cascade and delete all associations)
    await db.models.POG.destroy({where: {id: testReport.pog_id}, force: true});
  });
});
