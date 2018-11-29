const chai = require('chai');
const supertest = require('supertest');
const testData = require('../../../setupTestData.js');
const db = require('../../../../app/models');

const {expect} = chai;
const api = supertest('http://localhost:8081');

let testReport;
let targetedGene = {};
let alteration = {};

describe('Test genomic alterations identified endpoints', () => {
  it('Should successfully create a new genomic alteration identified and record change history', async () => {
    const newAlt = {
      geneVariant: 'testingGenomicAlterationsIdentifiedCreate',
    };

    const patient = await db.models.POG.findOne({where: {id: testReport.pog_id}});

    const res = await api.post(`/api/1.0/POG/${patient.POGID}/report/${testReport.ident}/genomic/summary/genomicAlterationsIdentified`)
      .set('Authorization', 'Basic bm1hcnRpbjooe31vKzBjTmY=')
      .send(newAlt);

    alteration = res.body;
    expect(res.status).to.equal(200);
    expect(alteration.geneVariant).to.equal(newAlt.geneVariant);

    // check that delete change history is the most recent to exist
    const opts = {
      where: {
        id: testReport.id,
        '$change_history.type$': 'create',
        '$change_history.entry_ident$': alteration.ident,
      },
      include: [
        {as: 'change_history', model: db.models.change_history},
      ],
    };

    const report = await db.models.analysis_report.find(opts);
    const changeHistory = report.change_history[0];

    expect(changeHistory.model_name).to.equal('genomicAlterationsIdentified');
    expect(changeHistory.entry_ident).to.equal(alteration.ident);
  });

  it('Should successfully update a genomic alteration identified and record change history', async () => {
    const patient = await db.models.POG.findOne({where: {id: testReport.pog_id}});

    const updateAlt = {
      geneVariant: 'testingGenomicAlterationsIdentifiedUpdate',
      comment: 'testing genomic alterations identified update',
    };

    const res = await api.put(`/api/1.0/POG/${patient.POGID}/report/${testReport.ident}/genomic/summary/genomicAlterationsIdentified/${alteration.ident}`)
      .set('Authorization', 'Basic bm1hcnRpbjooe31vKzBjTmY=')
      .send(updateAlt);

    alteration = res.body;
    expect(res.status).to.equal(200);
    expect(alteration.geneVariant).to.equal(updateAlt.geneVariant);

    // check that delete change history is the most recent to exist
    const opts = {
      where: {
        id: testReport.id,
        '$change_history.type$': 'update',
        '$change_history.entry_ident$': alteration.ident,
      },
      include: [
        {as: 'change_history', model: db.models.change_history},
      ],
    };

    const report = await db.models.analysis_report.find(opts);
    const changeHistory = report.change_history[0];

    expect(changeHistory.model_name).to.equal('genomicAlterationsIdentified');
    expect(changeHistory.entry_ident).to.equal(alteration.ident);
    expect(changeHistory.comment).to.equal(updateAlt.comment);
  });

  it('Should successfully delete a genomic alteration identified and record change history', async () => {
    const patient = await db.models.POG.findOne({where: {id: testReport.pog_id}});

    const deleteAlt = {
      comment: 'testing genomic alterations identified delete',
    };

    const res = await api.delete(`/api/1.0/POG/${patient.POGID}/report/${testReport.ident}/genomic/summary/genomicAlterationsIdentified/${alteration.ident}`)
      .set('Authorization', 'Basic bm1hcnRpbjooe31vKzBjTmY=')
      .send(deleteAlt);

    const checkAltExists = await db.models.genomicAlterationsIdentified.findOne({where: {ident: alteration.ident}});

    expect(res.status).to.equal(200);
    expect(res.body.success).to.equal(true);
    expect(checkAltExists).to.equal(null);

    // check that delete change history is the most recent to exist
    const opts = {
      where: {
        id: testReport.id,
        '$change_history.type$': 'delete',
        '$change_history.entry_ident$': alteration.ident,
      },
      include: [
        {as: 'change_history', model: db.models.change_history},
      ],
    };

    const report = await db.models.analysis_report.find(opts);
    const changeHistory = report.change_history[0];

    expect(changeHistory.model_name).to.equal('genomicAlterationsIdentified');
    expect(changeHistory.entry_ident).to.equal(alteration.ident);
    expect(changeHistory.comment).to.equal(deleteAlt.comment);
    expect(changeHistory.deleted_content).to.not.equal(null);
  });

  before(async () => {
    // create test report
    testReport = await testData.createTestReport('genomic');
  });

  after(async () => {
    // delete test patient (should cascade and delete all associations)
    await db.models.POG.destroy({where: {id: testReport.pog_id}, force: true});
  });
});
