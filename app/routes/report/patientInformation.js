const HTTP_STATUS = require('http-status-codes');
const express = require('express');
const db = require('../../models');

const router = express.Router({mergeParams: true});
const logger = require('../../log');

// Middleware for Patient Information
router.use('/', async (req, res, next) => {
  let result;
  try {
    result = await db.models.patientInformation.findOne({
      where: {reportId: req.report.id},
    });
  } catch (error) {
    logger.error(`Unable to query Patient Information for report ${req.report.ident} error: ${error}`);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: {message: `Unable to lookup the patient information for report ${req.report.ident}`},
    });
  }

  if (!result) {
    logger.error(`Unable to find the patient information for report ${req.report.ident}`);
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      error: {message: `Unable to find the patient information for report ${req.report.ident}`},
    });
  }

  // Add patient information to request
  req.patientInformation = result;
  return next();
});

// Handle requests for patient information
router.route('/')
  .get((req, res) => {
    return res.json(req.patientInformation.view('public'));
  })
  .put(async (req, res) => {
    try {
      await req.patientInformation.update(req.body);
      return res.json(req.patientInformation.view('public'));
    } catch (error) {
      logger.error(`Unable to update patient information ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Unable to update patient information'},
      });
    }
  });

module.exports = router;
