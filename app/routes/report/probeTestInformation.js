const HTTP_STATUS = require('http-status-codes');
const express = require('express');
const db = require('../../models');
const logger = require('../../log');

const router = express.Router({mergeParams: true});

const schemaGenerator = require('../../schemas/schemaGenerator');
const validateAgainstSchema = require('../../libs/validateAgainstSchema');
const {REPORT_UPDATE_BASE_URI} = require('../../constants');

// Generate schema's
const updateSchema = schemaGenerator(db.models.probeTestInformation, {
  baseUri: REPORT_UPDATE_BASE_URI, nothingRequired: true,
});


// Middleware for Probe Test Information
router.use('/', async (req, res, next) => {
  let result;
  try {
    result = await db.models.probeTestInformation.findOne({
      where: {reportId: req.report.id},
    });
  } catch (error) {
    logger.error(`Unable to get probe test information ${error}`);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: {message: 'Unable to get probe test information'},
    });
  }

  if (!result) {
    logger.error(`Unable to find probe test information for report ${req.report.ident}`);
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      error: {message: `Unable to find probe test information for report ${req.report.ident}`},
    });
  }

  // Add probe test information to request
  req.probeTestInformation = result;
  return next();
});

router.route('/')
  .get(async (req, res) => {
    return res.json(req.probeTestInformation.view('public'));
  })
  .put(async (req, res) => {
    // Validate request against schema
    try {
      validateAgainstSchema(updateSchema, req.body, false);
    } catch (error) {
      const message = `Error while validating probe test information update request ${error}`;
      logger.error(message);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message}});
    }

    try {
      await req.probeTestInformation.update(req.body, {userId: req.user.id});
      return res.json(req.probeTestInformation.view('public'));
    } catch (error) {
      logger.error(`Unable to update probe test information ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Unable to update probe test information'},
      });
    }
  });

module.exports = router;
