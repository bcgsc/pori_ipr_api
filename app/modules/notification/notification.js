const db = require('../../models');

const logger = require('../../log');

class Notification {
  /**
   * Initialize Notification object
   *
   * @param {string|object} init - Pass in either ident string or new object
   */
  constructor(init) {
    this.instance = null;
    this.model = db.models.notification;

    // Existing instance
    if (typeof init === 'object' && typeof init.ident === 'string') {
      this.instance = init;
    }
  }

  /**
   * Get full public version of this instance
   *
   * @returns {Promise.<object>} - Returns public instance of this notification
   */
  async getPublic() {
    const opts = {
      where: {
        ident: this.instance.ident,
      },
      attributes: {
        exclude: ['deletedAt'],
      },
      include: [
        {as: 'analysis', model: db.models.pog_analysis.scope('public')},
      ],
    };

    try {
      // Get updated public state with nested tasks
      return this.model.scope('public').findOne(opts);
    } catch (error) {
      logger.error(`There was an error while trying to get updated state ${error}`);
      throw new Error('Error while trying to get updated state');
    }
  }
}

module.exports = Notification;
