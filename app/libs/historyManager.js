const db = require('../models');

/**
 * Data Manager
 *
 * Interacts with DataHistory model. Can revert, undo, restore, and retrieve dataHistory entries.
 *
 * @param {string} ident - POG report history identification value
 *
 */
class HistoryManager {
  constructor(ident) {
    this.ident = ident;
  }

  /**
   * Revert the dataHistory entry
   *
   * @param {object} user - Currently authenticated user
   * @param {string} comment - Reason for change provided by user
   * @returns {Promise.<object>} - Returns status and the restored history
   */
  async revert(user, comment) {
    const history = await db.models.pog_analysis_reports_history.findOne({where: {ident: this.ident}, paranoid: false});

    if (history === null) {
      throw new Error('Unable to find a data history with that identifier');
    }

    this.history = history;
    this.model = history.get('model');

    // Find historical version of the data
    const versions = await db.models[this.model].findAll({
      where: {
        dataVersion: {
          $or: [this.history.get('previous'), this.history.get('new')],
        },
        ident: this.history.get('entry'),
      },
      paranoid: false,
    });

    // If there are not 2 entries, we can not restore.
    if (versions.length !== 2) {
      throw new Error('Unable to retrieve the current and previous versions of the data');
    }
    // Get Current/max Version
    const currentMaxVersion = await db.models[this.model].max('dataVersion', {where: {ident: this.history.get('entry')}});

    // Delete _all_ other verisons! --> eg: We might be reverting to version 15 of 21 versions
    await db.models[this.model].destroy({where: {ident: this.history.get('entry')}, paranoid: false});

    // Now restore the specified version!
    await db.models[this.model].restore({where: {dataVersion: this.history.get('previous'), ident: this.history.get('entry')}, limit: 1});

    // DataHistory the change!
    const entry = {
      type: 'change',
      table: this.history.get('table'),
      pog_id: this.history.get('pog_id'),
      model: this.history.get('model'),
      entry: this.history.get('entry'),
      previous: currentMaxVersion,
      new: this.history.get('previous'),
      user_id: user.id,
      comment,
    };

    // Log the restoration in the datahistory table.
    const newHistory = await db.models.pog_analysis_reports_history.create(entry, {returning: true});

    return {status: true, data: newHistory};
  }

  /**
   * Get Detailed entry(ies) for dataHistory new/previous
   *
   * @returns {Promise.<object>} - Returns a hashmap of {dataVersion: {entry}}
   */
  async detail() {
    // Retrieve detailed entries for each history value
    const history = await db.models.pog_analysis_reports_history.findOne({where: {ident: this.ident}, paranoid: false});

    if (history === null) {
      throw new Error('Unable to find a data history with that identifier');
    }

    this.history = history;
    this.model = history.get('model');

    // Find historical version of the data
    const fetchedVersions = await db.models[this.model].findAll({
      where: {
        dataVersion: {
          $or: [this.history.get('previous'), this.history.get('new')],
        },
        ident: this.history.get('entry'),
      },
      attributes: {exclude: ['id', 'pog_id']},
      paranoid: false,
    });

    const versions = {};
    // Loop over versions and match
    fetchedVersions.forEach((value) => {
      versions[value.dataVersion] = value;
    });

    return versions;
  }

  /**
   * Restore a remove entry
   *
   * @returns {Promise.<boolean>} - Returns true if restore was successful
   */
  async restore() {
    // Retrieve detailed entries for each history value
    const history = await db.models.pog_analysis_reports_history.findOne({where: {ident: this.ident}, paranoid: false});

    if (history === null) {
      throw new Error('Unable to find a data history with that identifier');
    }
    this.history = history;
    this.model = history.get('model');

    // Find and restore!
    const result = await db.models[this.model].restore({where: {ident: this.history.get('entry'), dataVersion: this.history.get('previous')}});

    if (result === null) {
      throw new Error('Unable to restore the removed entry');
    }

    // Remove the entry.
    history.destroy();

    return true;
  }
}


module.exports = HistoryManager;
