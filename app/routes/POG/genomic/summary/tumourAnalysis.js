const express = require('express');

const router = express.Router({mergeParams: true});
const db = require('../../../../models');

const logger = require('../../../../log');

// Middleware for Tumour Analysis
router.use('/', async (req, res, next) => {
  // Get Mutation Summary for this POG
  let result;
  try {
    result = await db.models.tumourAnalysis.scope('public').findOne({where: {pog_report_id: req.report.id}});
  } catch (error) {
    logger.error(`Unable to lookup the tumour analysis for ${req.POG.POGID} error: ${error}`);
    return res.status(500).json({error: {message: `Unable to lookup the tumour analysis for ${req.POG.POGID}`, code: 'failedTumourAnalysisQuery'}});
  }

  if (!result) {
    logger.error(`Unable to find tumour analysis for ${req.POG.POGID}`);
    return res.status(404).json({error: {message: `Unable to find tumour analysis for ${req.POG.POGID}`, code: 'failedTumourAnalysisLookup'}});
  }

  // Found the patient information
  req.tumourAnalysis = result;
  return next();
});

// Handle requests for Tumour Analysis
router.route('/')
  .get((req, res) => {
    // Get Patient History
    return res.json(req.tumourAnalysis);
  })
  .put(async (req, res) => {
    // Update DB Version for Entry
    try {
      const result = await db.models.tumourAnalysis.update(req.body, {
        where: {
          ident: req.tumourAnalysis.ident,
        },
        individualHooks: true,
        paranoid: true,
        returning: true,
      });

      // Get updated model data from update
      const [, [{dataValues}]] = result;

      // Remove id's and deletedAt properties from returned model
      const {
        id, pog_id, pog_report_id, deletedAt, ...publicModel
      } = dataValues;

      return res.json(publicModel);
    } catch (error) {
      logger.error(`Unable to update tumour analysis ${error}`);
      return res.status(500).json({error: {message: 'Unable to update tumour analysis', code: 'failedTumourAnalysisVersion'}});
    }
  });

module.exports = router;
