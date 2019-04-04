const db = require('../models');

module.exports = {
  /**
   * Checks if there's an event with this event_expression value and
   * if there isn't it creates a new event.
   *
   * @param {string} event - name of event
   * @param {object} user - event creator
   * @returns {Promise.<Object.<boolean, string>>} - Returns status and if the event exists or was created
   */
  eventCheck: async (event, user) => {
    const result = await db.models.kb_event.findOne({where: {key: {$ilike: event}}});

    // Create new event entry
    if (result === null) {
      // Create new event
      await db.models.kb_event.create({
        key: event,
        type: event.split('_')[0],
        createdBy_id: user.id,
        status: 'NEW',
      });

      return {status: true, event: 'created'};
    }
    return {status: true, event: 'exists'};
  },
};
