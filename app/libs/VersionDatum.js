const db = require('../models');

/**
 * Update a version of a given datum
 *
 * Creates new entry of same ident, then deletes previous version.
 *
 * @param {object} model - Sequelize Model that the datum belongs to
 * @param {object} currentEntry - The current/old version of the datum to be versioned
 * @param {object} newEntry - The new version of the data to be entered
 * @param {object} user - SequelizeJS Model of the user affecting the change
 * @param {string=} comment - Comment to be associated with the history event
 * @param {string=} destroyIndex - The column used to identify the entry to be destroyed (can be unique wrt dataVersion)
 * @param {array=} colsToMap - The columns to map from old to new entries
 * @returns {Promise.<Object.<boolean, Sequelize.create.response, Sequelize.destroy.response>>}
 * - Returns an object with the status and the create and destroy response
 *
 */
module.exports = async (model, currentEntry, newEntry, user, comment = '', destroyIndex = 'ident', colsToMap = ['ident', 'pog_id', 'pog_report_id']) => {

  const fullCurrentEntry = await model.findOne({where: {ident: currentEntry.ident}});

  // Update newEntry values
  colsToMap.forEach((col) => {
    if (!(col in currentEntry)) {
      throw new Error(`The column: ${col} does not exist on the current Entry.`);
    }
    newEntry[col] = fullCurrentEntry[col]; // Map from old to new
  });

  // Get the max for the current dataVersion in the table
  const maxCurrentVersion = await model.max('dataVersion', {where: {ident: currentEntry.ident}, paranoid: false});

  if (typeof maxCurrentVersion !== 'number') {
    throw new Error('Unable to find current max version of data entry');
  }

  newEntry.dataVersion = maxCurrentVersion + 1;
  delete newEntry.id; // Remove the ID value if it got through some how.

  // Create new entry
  const createResponse = await model.create(newEntry);

  // Are we not destroying?
  if (!destroyIndex) {
    return {status: true, data: {create: createResponse}};
  }

  // Set version to be destroyed
  const destroyWhere = {
    dataVersion: currentEntry.dataVersion,
  };
  // Set destroy index
  destroyWhere[destroyIndex] = currentEntry[destroyIndex];

  // Delete existing version
  const destroyResponse = await model.destroy({where: destroyWhere, limit: 1});

  let reportId = null;
  if (newEntry.pog_report_id) {
    reportId = newEntry.pog_report_id;
  }
  if (newEntry.report_id) {
    reportId = newEntry.report_id;
  }

  // Create DataHistory entry
  const dh = {
    type: 'change',
    pog_id: newEntry.pog_id,
    pog_report_id: reportId,
    table: model.getTableName(),
    model: model.name,
    entry: newEntry.ident,
    previous: currentEntry.dataVersion,
    new: newEntry.dataVersion,
    user_id: user.id,
    comment,
  };

  await db.models.pog_analysis_reports_history.create(dh);
  return {status: true, data: {create: createResponse, destroy: destroyResponse}};
};
