const HTTP_STATUS = require('http-status-codes');
const express = require('express');
const db = require('../../../../models');
const logger = require('../../../../log');

const router = express.Router({mergeParams: true});

// Middleware for Mutation Summary
router.use('/', async (req, res, next) => {
  // Get Mutation Summary for this report
  let result;
  try {
    result = await db.models.mutationSummaryv2.scope('public').findAll({where: {report_id: req.report.id}});
  } catch (error) {
    logger.error(`Unable to lookup mutation summaries for report ${req.report.ident} error: ${error}`);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: `Unable to lookup the mutation summaries for ${req.report.ident}`, code: 'failedMutationSummaryQuery'}});
  }

  if (!result) {
    logger.error(`Unable to find mutation summary for ${req.report.ident}`);
    return res.status(HTTP_STATUS.NOT_FOUND).json({error: {message: `Unable to find mutation summary for ${req.report.ident}`, code: 'failedMutationSummaryLookup'}});
  }

  // Found the patient information
  req.mutationSummary = result;
  return next();
});

// Handle requests for mutation summary
router.route('/')
  .get((req, res) => {
    // Get Patient History
    return res.json(req.mutationSummary);
  })
  .put(async (req, res) => {
    // Update DB Version for Entry
    try {
      const result = await db.models.mutationSummary.update(req.body, {
        where: {
          ident: req.mutationSummary.ident,
        },
        individualHooks: true,
        paranoid: true,
        returning: true,
      });

      // Get updated model data from update
      const [, [{dataValues}]] = result;

      // Remove id's and deletedAt properties from returned model
      const {
        id, report_id, deletedAt, ...publicModel
      } = dataValues;

      return res.json(publicModel);
    } catch (error) {
      logger.error(`Unable to update mutation summary ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to update mutation summary', code: 'failedMutationSummaryVersion'}});
    }
  });

module.exports = router;
