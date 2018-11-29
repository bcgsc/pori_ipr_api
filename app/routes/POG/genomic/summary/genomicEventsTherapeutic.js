const express = require('express');
const db = require('../../../../../app/models');
const versionDatum = require('../../../../../app/libs/VersionDatum');

const router = express.Router({mergeParams: true});
const {logger} = process;
const model = db.models.genomicEventsTherapeutic;

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
  .put((req, res) => {
    // Update DB Version for Entry
    versionDatum(model, req.event, req.body, req.user).then(
      (resp) => {
        res.json(resp.data.create);
      },
      (error) => {
        logger.error(error);
        res.status(500).json({error: {message: 'Unable to version the resource', code: 'failedMutationSummaryVersion'}});
      }
    );
  })
  .delete((req, res) => {
    // Soft delete the entry
    // Update result
    model.destroy({where: {ident: req.event.ident}}).then(
      () => {
        // Return success
        res.status(204);
      },
      () => {
        res.status(500).json({error: {message: 'Unable to remove resource', code: 'failedGenomicEventsTherapeuticRemove'}});
      }
    );
  });

// Routing for event
router.route('/')
  .get((req, res) => {
    const options = {
      where: {
        pog_report_id: req.report.id,
      },
    };

    // Get all rows for this POG
    model.scope('public').findAll(options).then(
      (result) => {
        res.json(result);
      },
      (error) => {
        logger.error(error);
        res.status(500).json({error: {message: 'Unable to retrieve resource', code: 'failedGenomicEventsTherapeuticQuery'}});
      }
    );
  });

module.exports = router;
