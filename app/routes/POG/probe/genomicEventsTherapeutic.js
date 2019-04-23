const express = require('express');
const db = require('../../../models');
const versionDatum = require('../../../libs/VersionDatum');
const logger = require('../../../../lib/log');

const router = express.Router({mergeParams: true});
const model = db.models.genomicEventsTherapeutic;

router.param('gene', async (req, res, next, altIdent) => {
  try {
    const result = model.scope('public').findOne({where: {ident: altIdent, reportType: 'probe'}});
    if (!result) {
      return res.status(404).json({error: {message: 'Unable to locate the requested resource.', code: 'failedGenomicEventsTherapeuticLookup'}});
    }
    req.event = result;
    return next();
  } catch (error) {
    logger.error(`Error on finding genomic therapeutic event ${error}`);
    return res.status(500).json({error: {message: 'Unable to process the request.', code: 'failedGenomicEventsTherapeuticQuery'}});
  }
});

// Handle requests for events
router.route('/:gene([A-z0-9-]{36})')
  .get((req, res) => {
    return res.json(req.event);
  })
  .put(async (req, res) => {
    try {
      // Update DB Version for Entry
      const result = await versionDatum(model, req.event, req.body, req.user);
      return res.json(result.data.create);
    } catch (error) {
      logger.error(`Unable to update db verion for entry ${error}`);
      return res.status(500).json({error: {message: 'Unable to version the resource', code: 'failedMutationSummaryVersion'}});
    }
  })
  .delete(async (req, res) => {
    try {
      // Soft delete the entry
      // Update result
      await model.destroy({where: {ident: req.event.ident}});
      return res.status(204);
    } catch (error) {
      logger.error(`Entry delete was unsuccessful ${error}`);
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
      const results = await model.scope('public').findAll(options);
      return res.json(results);
    } catch (error) {
      logger.error(error);
      return res.status(500).json({error: {message: 'Unable to retrieve resource', code: 'failedGenomicEventsTherapeuticQuery'}});
    }
  });

module.exports = router;
