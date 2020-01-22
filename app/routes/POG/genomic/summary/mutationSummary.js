const express = require('express');
const db = require('../../../../models');
const logger = require('../../../../log');

const router = express.Router({mergeParams: true});

// Middleware for Mutation Summary
router.use('/', async (req, res, next) => {
  // Get Mutation Summary for this POG
  let result;
  try {
    result = await db.models.mutationSummaryv2.scope('public').findAll({where: {report_id: req.report.id}});
  } catch (error) {
    logger.error(`Unable to lookup mutation summaries for ${req.POG.POGID} error: ${error}`);
    return res.status(500).json({error: {message: `Unable to lookup the mutation summaries for ${req.POG.POGID}`, code: 'failedMutationSummaryQuery'}});
  }

  if (!result) {
    logger.error(`Unable to find mutation summary for ${req.POG.POGID}`);
    return res.status(404).json({error: {message: `Unable to find mutation summary for ${req.POG.POGID}`, code: 'failedMutationSummaryLookup'}});
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
        id, pog_id, report_id, deletedAt, ...publicModel
      } = dataValues;

      return res.json(publicModel);
    } catch (error) {
      logger.error(`Unable to update mutation summary ${error}`);
      return res.status(500).json({error: {message: 'Unable to update mutation summary', code: 'failedMutationSummaryVersion'}});
    }
  });

module.exports = router;
