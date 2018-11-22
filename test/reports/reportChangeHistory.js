// chai dependencies
const chai = require('chai');

const expect = chai.expect;

// ipr module dependencies
const db = require('../../app/models');
const testData = require('../setupTestData.js');
const reportChangeHistory = require('../../app/libs/reportChangeHistory.js');

let testUser;
let testReport;
let newAlteration;

describe('Record change history events', () => {
  it('should create change history records for a create event', async () => {
    const recordCreateSuccess = await reportChangeHistory.recordCreate(
      newAlteration.ident,
      'genomicAlterationsIdentified',
      testUser.id,
      testReport.id,
      'genomic alteration identified'
    );

    expect(recordCreateSuccess).to.equal(true);
  });

  it('should create change history records for an update event', async () => {
    const updatedAlts = await db.models.genomicAlterationsIdentified.update({geneVariant: 'UpdatedTestAlteration'}, {where: {id: newAlteration.id}, returning: true});

    const updatedAlteration = updatedAlts[1][0];

    const recordUpdateSuccess = await reportChangeHistory.recordUpdate(
      updatedAlteration.ident,
      'genomicAlterationsIdentified',
      'geneVariant',
      newAlteration.geneVariant,
      updatedAlteration.geneVariant,
      testUser.id,
      testReport.id,
      'genomic alteration identified',
      'testing update change history'
    );

    expect(recordUpdateSuccess).to.equal(true);
  });

  it('should create change history records for a delete event', async () => {
    // set up deleted content JSON - remove id and timestamps
    const deletedContent = newAlteration;
    delete deletedContent.id;
    delete deletedContent.createdAt;
    delete deletedContent.updatedAt;
    delete deletedContent.deletedAt;

    await db.models.genomicAlterationsIdentified.destroy({where: {id: newAlteration.id}, force: true});
    const recordDeleteSuccess = await reportChangeHistory.recordDelete(
      deletedContent.ident,
      'genomicAlterationsIdentified',
      deletedContent,
      testUser.id,
      testReport.id,
      'genomic alteration identified',
      'testing delete change history'
    );

    expect(recordDeleteSuccess).to.equal(true);
  });

  it('should revert update event and create change history records for an update event', async () => {
    const updatedAlts = await db.models.genomicAlterationsIdentified.update({geneVariant: 'UpdatedTestAlteration'}, {where: {id: newAlteration.id}, returning: true});

    const updatedAlteration = updatedAlts[1][0];

    await reportChangeHistory.recordUpdate(
      updatedAlteration.ident,
      'genomicAlterationsIdentified',
      'geneVariant',
      newAlteration.geneVariant,
      updatedAlteration.geneVariant,
      testUser.id,
      testReport.id,
      'genomic alteration identified',
      'testing update change history'
    );

    const maxUpdateChangeHistoryId = await db.models.change_history.max('id', {where: {entry_ident: updatedAlteration.ident, type: 'update'}});
    const updateChangeHistory = await db.models.change_history.findOne({where: {id: maxUpdateChangeHistoryId}});

    const revertUpdateSuccess = await reportChangeHistory.revert(updateChangeHistory.id, testUser.id, 'testing revert update change history');
    expect(revertUpdateSuccess).to.equal(true);
  });

  it('should revert delete event and create change history records for reverting a delete event', async () => {
    // set up deleted content JSON - remove id and timestamps
    const deletedContent = newAlteration;
    delete deletedContent.id;
    delete deletedContent.createdAt;
    delete deletedContent.updatedAt;
    delete deletedContent.deletedAt;

    await db.models.genomicAlterationsIdentified.destroy({where: {id: newAlteration.id}, force: true}); // delete alteration
    await reportChangeHistory.recordDelete( // record deletion in change history
      deletedContent.ident,
      'genomicAlterationsIdentified',
      deletedContent,
      testUser.id,
      testReport.id,
      'genomic alteration identified',
      'testing delete change history'
    );

    const maxDeleteChangeHistoryId = await db.models.change_history.max('id', {where: {entry_ident: deletedContent.ident, type: 'delete'}});
    const deleteChangeHistory = await db.models.change_history.findOne({where: {id: maxDeleteChangeHistoryId}});

    const revertDeleteSuccess = await reportChangeHistory.revert(deleteChangeHistory.id, testUser.id, 'testing revert delete change history');
    expect(revertDeleteSuccess).to.equal(true);
  });

  it('should not revert a delete event for a record that already exists', async () => {
    // set up deleted content JSON - remove id and timestamps
    const deletedContent = newAlteration;
    delete deletedContent.id;
    delete deletedContent.createdAt;
    delete deletedContent.updatedAt;
    delete deletedContent.deletedAt;

    await reportChangeHistory.recordDelete(
      deletedContent.ident,
      'genomicAlterationsIdentified',
      deletedContent,
      testUser.id,
      testReport.id,
      'genomic alteration identified',
      'testing delete change history'
    );

    const maxDeleteChangeHistoryId = await db.models.change_history.max('id', {where: {entry_ident: deletedContent.ident, type: 'delete'}});
    const deleteChangeHistory = await db.models.change_history.findOne({where: {id: maxDeleteChangeHistoryId}});

    const revertDeleteSuccess = await reportChangeHistory.revert(deleteChangeHistory.id, testUser.id, 'testing revert delete change history');
    expect(revertDeleteSuccess).to.equal(false);
  });

  it('should not revert a delete event that is not the most recent one', async () => {
    // set up deleted content JSON - remove id and timestamps
    const deletedContent = newAlteration;
    delete deletedContent.id;
    delete deletedContent.createdAt;
    delete deletedContent.updatedAt;
    delete deletedContent.deletedAt;

    await db.models.genomicAlterationsIdentified.destroy({where: {id: newAlteration.id}, force: true}); // delete alteration

    await reportChangeHistory.recordDelete( // record initial deletion
      deletedContent.ident,
      'genomicAlterationsIdentified',
      deletedContent,
      testUser.id,
      testReport.id,
      'genomic alteration identified',
      'testing delete change history'
    );

    // get change history record we want to attempt to revert
    const maxDeleteChangeHistoryId = await db.models.change_history.max('id', {where: {entry_ident: deletedContent.ident, type: 'delete'}});
    const deleteChangeHistory = await db.models.change_history.findOne({where: {id: maxDeleteChangeHistoryId}});

    await reportChangeHistory.recordDelete( // record another deletion
      deletedContent.ident,
      'genomicAlterationsIdentified',
      deletedContent,
      testUser.id,
      testReport.id,
      'genomic alteration identified',
      'testing delete change history'
    );

    const revertDeleteSuccess = await reportChangeHistory.revert(deleteChangeHistory.id, testUser.id, 'testing revert delete change history');
    expect(revertDeleteSuccess).to.equal(false);
  });

  it('should not revert a create event', async () => {
    await reportChangeHistory.recordCreate(
      newAlteration.ident,
      'genomicAlterationsIdentified',
      testUser.id,
      testReport.id,
      'genomic alteration identified'
    );

    // get change history record we want to attempt to revert
    const maxCreateChangeHistoryId = await db.models.change_history.max('id', {where: {entry_ident: newAlteration.ident, type: 'create'}});
    const createChangeHistory = await db.models.change_history.findOne({where: {id: maxCreateChangeHistoryId}});

    const revertCreateSuccess = await reportChangeHistory.revert(createChangeHistory.id, testUser.id, 'testing revert create change history');

    expect(revertCreateSuccess).to.equal(false);
  });

  before(async () => {
    await testData.createTestAccounts();
    testUser = await db.models.user.find({where: {username: 'aUserForTesting'}});
    testReport = await testData.createTestReport();
  });

  after(async () => {
    await testData.deleteTestAccounts();
  });

  beforeEach(async () => {
    newAlteration = await db.models.genomicAlterationsIdentified.create({geneVariant: 'TestAlteration', pog_report_id: testReport.id});
  });

  afterEach(async () => {
    await db.models.genomicAlterationsIdentified.destroy({where: {id: newAlteration.id}, force: true});
    await db.models.change_history.destroy({where: {entry_ident: newAlteration.ident}});
  });
});
