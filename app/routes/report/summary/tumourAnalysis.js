const HTTP_STATUS = require('http-status-codes');
const express = require('express');
const validateAgainstSchema = require('../../../libs/validateAgainstSchema');
const tumourAnalysisSchema = require('../../../schemas/report/summary/tumourAnalysis');

const router = express.Router({mergeParams: true});
const db = require('../../../models');

const logger = require('../../../log');

// Middleware for Tumour Analysis
router.use('/', async (req, res, next) => {
  // Get tumour analysis for this report
  let result;
  try {
    result = await db.models.tumourAnalysis.findOne({
      where: {reportId: req.report.id},
    });
  } catch (error) {
    logger.error(`Unable to lookup the tumour analysis for ${req.report.ident} error: ${error}`);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: `Unable to lookup the tumour analysis for ${req.report.ident}`}});
  }

  if (!result) {
    logger.error(`Unable to find tumour analysis for ${req.report.ident}`);
    return res.status(HTTP_STATUS.NOT_FOUND).json({error: {message: `Unable to find tumour analysis for ${req.report.ident}`}});
  }

  // Add tumour analysis to request
  req.tumourAnalysis = result;
  return next();
});

// Handle requests for Tumour Analysis
router.route('/')
  .get((req, res) => {
    return res.json(req.tumourAnalysis.view('public'));
  })
  .put(async (req, res) => {
    try {
      // validate against the model
      validateAgainstSchema(tumourAnalysisSchema, req.body);
    } catch (err) {
      const message = `There was an error updating tumour analysis ${err}`;
      logger.error(message);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message}});
    }

    // Update db entry
    try {
      await req.tumourAnalysis.update(req.body);
      return res.json(req.tumourAnalysis.view('public'));
    } catch (error) {
      logger.error(`Unable to update tumour analysis ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to update tumour analysis'}});
    }
  });

module.exports = router;
