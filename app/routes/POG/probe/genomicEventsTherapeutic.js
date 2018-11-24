const express = require('express');
const db = require('../../../../app/models');
const versionDatum = require('../../../../app/libs/VersionDatum');

const router = express.Router({mergeParams: true});

router.param('gene', async (req, res, next, altIdent) => {
  try {
    // Get events for this report
    const event = await db.models.genomicEventsTherapeutic.scope('public').findOne({where: {ident: altIdent, reportType: 'probe'}});

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
      returnMessage = 'event could not be found';
    }

    return res.status(returnStatus).json({error: {message: `An error occurred while trying to find events with ident ${altIdent}: ${returnMessage}`}});
  }
});

// Handle requests for events
router.route('/:gene([A-z0-9-]{36})')
  .get((req, res) => res.json(req.event))
  .put(async (req, res) => {
    try {
      // Update DB Version for Entry
      const version = await versionDatum(db.models.genomicEventsTherapeutic, req.event, req.body, req.user);
      return res.json(version.data.create);
    } catch (err) {
      return res.status(500).json({error: {message: 'Unable to version the resource', code: 'failedGenomicEventsTherapeuticVersion'}});
    }
  })
  .delete(async (req, res) => {
    try {
      // Soft delete the entry
      // Update result
      await db.models.genomicEventsTherapeutic.destroy({where: {ident: req.event.ident}});

      // Return success
      return res.status(204);
    } catch (err) {
      return res.status(500).json({error: {message: 'Unable to remove resource', code: 'failedGenomicEventsTherapeuticRemove'}});
    }
  });

// Routing for event
router.route('/')
  .get(async (req, res) => {
    const options = {
      where: {
        pog_report_id: req.report.id,
        reportType: 'probe',
      },
    };

    try {
      // Get all rows for this POG
      const events = await db.models.genomicEventsTherapeutic.scope('public').findAll(options);
      return res.json(events);
    } catch (err) {
      return res.status(500).json({error: {message: 'Unable to retrieve resource', code: 'failedGenomicEventsTherapeuticQuery'}});
    }
  });

module.exports = router;
