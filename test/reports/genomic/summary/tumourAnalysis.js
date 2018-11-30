const chai = require('chai');
const supertest = require('supertest');
const testData = require('../../../setupTestData.js');
const db = require('../../../../app/models');

const {expect} = chai;
const api = supertest('http://localhost:8081');

let testReport;
let tumourAnalysis = {};

describe('Test tumour analysis endpoints', () => {
  it('Should successfully update tumour analysis and record change history', async () => {
    const newTumourAnalysis = {
      ploidy: 'testingUpdateTumourAnalysis',
      comment: 'testing tumour analysis update',
    };

    const patient = await db.models.POG.findOne({where: {id: testReport.pog_id}});

    const res = await api.put(`/api/1.0/POG/${patient.POGID}/report/${testReport.ident}/genomic/summary/tumourAnalysis`)
      .set('Authorization', 'Basic bm1hcnRpbjooe31vKzBjTmY=')
      .send(newTumourAnalysis);

    const updatedTumourAnalysis = res.body;
    expect(res.status).to.equal(200);
    expect(updatedTumourAnalysis.ploidy).to.equal(newTumourAnalysis.ploidy);

    // check that delete change history is the most recent to exist
    const opts = {
      where: {
        id: testReport.id,
        '$change_history.type$': 'update',
        '$change_history.entry_ident$': updatedTumourAnalysis.ident,
      },
      include: [
        {as: 'change_history', model: db.models.change_history},
      ],
    };

    const report = await db.models.analysis_report.find(opts);
    const changeHistory = report.change_history[0];

    expect(changeHistory.model_name).to.equal('tumourAnalysis');
    expect(changeHistory.entry_ident).to.equal(updatedTumourAnalysis.ident);
    expect(changeHistory.comment).to.equal(newTumourAnalysis.comment);
  });

  before(async () => {
    // create test report
    testReport = await testData.createTestReport('genomic');

    // create test tumour analysis
    const testTumourAnalysis = {
      tumourContent: 1,
      ploidy: 'test create tumour analysis',
      pog_report_id: testReport.id,
    };
    tumourAnalysis = await db.models.tumourAnalysis.create(testTumourAnalysis);
  });

  after(async () => {
    // delete change history created in testing
    await db.models.change_history.destroy({where: {entry_ident: tumourAnalysis.ident}});
    // delete test patient (should cascade and delete all associations)
    await db.models.POG.destroy({where: {id: testReport.pog_id}, force: true});
  });
});
