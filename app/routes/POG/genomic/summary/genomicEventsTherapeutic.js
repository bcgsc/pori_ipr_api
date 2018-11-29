const express = require('express');
const db = require('../../../../../app/models');
const reportChangeHistory = require('../../../../../app/libs/reportChangeHistory');

const router = express.Router({mergeParams: true});
const {logger} = process;

router.param('gene', async (req, res, next, altIdent) => {
  try {
    // Look for gene w/ matching ident
    const event = await db.models.genomicEventsTherapeutic.scope('public').findOne({where: {ident: altIdent}});

    if (!event) throw new Error('notFoundError'); // no event found

    // event found, set request param
    req.event = event;
    return next();
  } catch (err) {
    // set default return status and message
    let returnStatus = 500;
    let returnMessage = err.message;

    if (err.message === 'notFoundError') { // return 404 error - event could not be found
      returnStatus = 404;
      returnMessage = 'therapeutic event could not be found';
    }

    return res.status(returnStatus).json({error: {message: `An error occurred while trying to find therapeutic event with ident ${altIdent}: ${returnMessage}`}});
  }
});

// Handle requests for events
router.route('/:gene([A-z0-9-]{36})')
  .get((req, res) => res.json(req.event))
  .put(async (req, res) => {
    // specify editable fields
    const editable = ['genomicEvent', 'approvedThisCancerType', 'approvedOtherCancerType', 'emergingPreclinicalEvidence', 'comments'];
    const editableErr = [];

    const updateEvent = {}; // set up object for updating fields
    const oldEvent = req.event;
    const newEvent = req.body;

    for (const field in newEvent) {
      if (newEvent[field]) {
        const fieldValue = newEvent[field];
        if (fieldValue !== oldEvent[field] && field !== 'comment') {
          if (!editable.includes(field)) editableErr.push(field); // check if user is editing a non-editable field
          updateEvent[field] = fieldValue;
        }
      }
    }

    if (editableErr.length > 0) return res.status(400).json({error: {message: `The following alteration fields are not editable: ${editableErr.join(', ')}`}});

    try {
      // Update entry
      const update = await db.models.genomicEventsTherapeutic.update(updateEvent, {where: {ident: oldEvent.ident}, returning: true});
      const updatedEvent = update[1][0];

      // Record change history for each field updated
      for (const field in updateEvent) {
        if (updateEvent[field]) {
          const changeHistorySuccess = await reportChangeHistory.recordUpdate(updatedEvent.ident, 'genomicEventsTherapeutic', field, oldEvent[field], updateEvent[field], req.user.id, updatedEvent.pog_report_id, 'genomic events therapeutic', req.body.comment);

          if (!changeHistorySuccess) {
            logger.error(`Failed to record report change history for updating alteration with ident ${updatedEvent.ident}.`);
          }
        }
      }

      return res.json(updatedEvent);
    } catch (err) {
      const errMessage = `An error occurred while updating alteration: ${err.message}`; // set up error message
      logger.error(errMessage); // log error
      return res.status(500).json({error: {message: errMessage}}); // return error to client
    }
  })
  .delete(async (req, res) => {
    try {
      // get alteration record to store in change history
      const deletedEvent = await db.models.genomicEventsTherapeutic.findOne({where: {ident: req.event.ident}});
      delete deletedEvent.id;

      // force delete entry
      await db.models.genomicEventsTherapeutic.destroy({where: {ident: req.event.ident}, force: true});

      // record change history
      const changeHistorySuccess = await reportChangeHistory.recordDelete(deletedEvent.ident, 'genomicEventsTherapeutic', deletedEvent, req.user.id, deletedEvent.pog_report_id, 'genomic events therapeutic', req.body.comment);

      if (!changeHistorySuccess) {
        logger.error(`Failed to record report change history for deleting therapeutic event with ident ${deletedEvent.ident}.`);
      }

      return res.json({success: true});
    } catch (err) {
      const errMessage = `An error occurred while deleting therapeutic event: ${err.message}`; // set up error message
      logger.error(errMessage); // log error
      return res.status(500).json({error: {message: errMessage}}); // return error to client
    }
  });

// Routing for event
router.route('/')
  .get(async (req, res) => {
    const options = {
      where: {
        pog_report_id: req.report.id,
      },
    };
    try {
      const events = await db.models.genomicEventsTherapeutic.scope('public').findAll(options);
      return res.json(events);
    } catch (err) {
      const errMessage = `An error occurred while retrieving therapeutic events: ${err.message}`; // set up error message
      logger.error(errMessage); // log error
      return res.status(500).json({error: {message: errMessage}}); // return error to client
    }
  });

module.exports = router;
