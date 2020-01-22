const HTTP_STATUS = require('http-status-codes');
const express = require('express');

const router = express.Router({mergeParams: true});
const db = require('../../../../models');

const logger = require('../../../../log');

const model = db.models.genomicEventsTherapeutic;

router.param('gene', async (req, res, next, altIdent) => {
  let result;
  try {
    result = await model.scope('public').findOne({where: {ident: altIdent}});
  } catch (error) {
    logger.error(`Unable to get genomic events therapeutic ${error}`);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to get genomic events therapeutic', code: 'failedGenomicEventsTherapeuticQuery'}});
  }

  if (!result) {
    logger.error('Unable to locate requested genomic events therapeutic');
    return res.status(HTTP_STATUS.NOT_FOUND).json({error: {message: 'Unable to locate the requested genomic events therapeutic', code: 'failedGenomicEventsTherapeuticLookup'}});
  }

  req.event = result;
  return next();
});

// Handle requests for events
router.route('/:gene([A-z0-9-]{36})')
  .get((req, res) => {
    return res.json(req.event);
  })
  .put(async (req, res) => {
    // Update DB Version for Entry
    try {
      const result = await model.update(req.body, {
        where: {
          ident: req.event.ident,
        },
        individualHooks: true,
        paranoid: true,
        returning: true,
      });

      // Get updated model data from update
      const [, [{dataValues}]] = result;

      // Remove id's and deletedAt properties from returned model
      const {
        id, pog_id, report_id, deletedAt, ...publicModel
      } = dataValues;

      return res.json(publicModel);
    } catch (error) {
      logger.error(`Unable to update genomic events therapeutic ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to update genomic events therapeutic', code: 'failedMutationSummaryVersion'}});
    }
  })
  .delete(async (req, res) => {
    // Soft delete the entry
    // Update result
    try {
      await model.destroy({where: {ident: req.event.ident}});
      return res.status(HTTP_STATUS.NO_CONTENT);
    } catch (error) {
      logger.error(`Unable to remove genomic events therapeutic ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to remove genomic events therapeutic', code: 'failedGenomicEventsTherapeuticRemove'}});
    }
  });

// Routing for event
router.route('/')
  .get(async (req, res) => {
    const options = {
      where: {
        report_id: req.report.id,
      },
    };

    // Get all rows for this POG
    try {
      const results = await model.scope('public').findAll(options);
      return res.json(results);
    } catch (error) {
      logger.error(`Unable to retrieve all genomic events therapeutic ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to retrieve all genomic events therapeutic', code: 'failedGenomicEventsTherapeuticQuery'}});
    }
  });

module.exports = router;
