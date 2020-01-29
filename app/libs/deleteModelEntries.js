const db = require('../models');

/**
 * Hard delete all model entries specified in the entries object
 * parameter by the entries id
 *
 * @param {object} entries - Object mapping models to entry id
 * @returns {undefined}
 */
const deleteModelEntries = async (entries) => {
  for (const model in entries) {
    if (Object.prototype.hasOwnProperty.call(entries, model)) {
      // need to await on hard delete because could cause a race condition
      // (i.e deleting a patient will remove the report, analysis, etc.)
      await db.models[model].destroy({where: {id: entries[model]}, force: true});
    }
  }
};

module.exports = deleteModelEntries;
