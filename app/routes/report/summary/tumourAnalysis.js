const HTTP_STATUS = require('http-status-codes');
const express = require('express');

const router = express.Router({mergeParams: true});
const db = require('../../../../models');

const logger = require('../../../../log');

// Middleware for Tumour Analysis
router.use('/', async (req, res, next) => {
  // Get Mutation Summary for this report
  let result;
  try {
    result = await db.models.tumourAnalysis.scope('public').findOne({where: {report_id: req.report.id}});
  } catch (error) {
    logger.error(`Unable to lookup the tumour analysis for ${req.report.ident} error: ${error}`);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: `Unable to lookup the tumour analysis for ${req.report.ident}`, code: 'failedTumourAnalysisQuery'}});
  }

  if (!result) {
    logger.error(`Unable to find tumour analysis for ${req.report.ident}`);
    return res.status(HTTP_STATUS.NOT_FOUND).json({error: {message: `Unable to find tumour analysis for ${req.report.ident}`, code: 'failedTumourAnalysisLookup'}});
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
        id, report_id, deletedAt, ...publicModel
      } = dataValues;

      return res.json(publicModel);
    } catch (error) {
      logger.error(`Unable to update tumour analysis ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to update tumour analysis', code: 'failedTumourAnalysisVersion'}});
    }
  });

module.exports = router;
