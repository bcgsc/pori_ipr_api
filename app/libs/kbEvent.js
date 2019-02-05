// app/routes/genomic/detailedGenomicAnalysis.js
const db = require('../../../app/models');

module.exports = {

  eventCheck: async (event, user) => {

    // Check if there's an event with this event_expression value
    const result = await db.models.kb_event.findOne({where: {key: {$ilike: event}}});

    // Create new event entry
    if(result === null) {

      // Create new event
      await db.models.kb_event.create({
        key: event,
        type: event.split('_')[0],
        createdBy_id: user.id,
        status: 'NEW',
      });

      return {status: true, event: 'created'};
    } else {
      return {status: true, event: 'exists'};
    }
  }
};
