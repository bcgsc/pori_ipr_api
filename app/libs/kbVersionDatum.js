const db = require('../../../app/models');


/*
 * Update a version of a given datum
 *
 * Creates new entry of same ident, then deletes previous version.
 *
 * @param required object model - Sequelize Model that the datum belongs to
 * @param required object currentEntry - The current/old version of the datum to be versioned
 * @param required object newEntry - The new version of the data to be entered
 * @param optional string destroyIndex - The column used to identify the entry to be destroyed (can be unique wrt dataVersion)
 * @param optional array colsToMap - The columns to map from old to new entries
 *
 * @returns promise
 *
 * @resolves object - {status: bool, create: Sequelize.create.response, destroy: Sequelize.destroy.response}
 *
 * @rejects object - {status: bool, message: string}
 *
 */
module.exports = async (model, currentEntry, newEntry, user, comment = '', destroyIndex = 'ident', colsToMap = ['ident']) => {

  // Update newEntry values
  colsToMap.forEach((col) => {
    if(!(col in currentEntry)) {
      throw new Error('The column: ' + col + ' does not exist on the current Entry.');
    }
    newEntry[col] = currentEntry[col]; // Map from old to new
  });

  // Get the max for the current dataVersion in the table
  const maxCurrentVersion = await model.max('dataVersion', {where: {ident: currentEntry.ident}, paranoid: false});

  if(!typeof maxCurrentVersion === 'number') {
    throw new Error('Unable to find current max version of data entry');
  }

  newEntry.dataVersion = maxCurrentVersion + 1;

  // Create new entry
  const createResponse = model.create(newEntry);

  // Are we not destroying?
  if(!destroyIndex) {
    return {status: true, data: {create: createResponse}};
  } else {
    // Set version to be destroyed
    const destroyWhere = {
      dataVersion: currentEntry.dataVersion
    };
    // Set destroy index
    destroyWhere[destroyIndex] = currentEntry[destroyIndex];

    // Delete existing version
    const destroyResponse = await model.destroy({where: destroyWhere, limit: 1});

    // Create DataHistory entry
    const dh = {
      type: 'change',
      table: model.getTableName(),
      model: model.name,
      entry: newEntry.ident,
      previous: currentEntry.dataVersion,
      new: newEntry.dataVersion,
      user_id: user.id,
      comment: comment
    };

    // Create History
    const createdHistory = db.models.kb_history.create(dh);
    return {status: true, data: {create: createResponse, history: createdHistory, destroy: destroyResponse}};
  }
};
