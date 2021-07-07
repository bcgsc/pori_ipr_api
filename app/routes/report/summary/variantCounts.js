const HTTP_STATUS = require('http-status-codes');
const express = require('express');

const router = express.Router({mergeParams: true});
const db = require('../../../models');
const logger = require('../../../log');

// Middleware for Variant Counts
router.use('/', async (req, res, next) => {
  // Get variant counts for report
  let result;
  try {
    result = await db.models.variantCounts.findOne({
      where: {reportId: req.report.id},
    });
  } catch (error) {
    logger.error(`Unable to lookup variant counts for report: ${req.report.ident} error: ${error}`);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: {message: `Unable to lookup variant counts for report: ${req.report.ident}`},
    });
  }

  if (!result) {
    logger.error(`Unable to find variant counts for report: ${req.report.ident}`);
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      error: {message: `Unable to find variant counts for ${req.report.ident}`},
    });
  }

  // Add variant counts to request
  req.variantCounts = result;
  return next();
});

// Handle requests for Variant Counts
router.route('/')
  .get((req, res) => {
    return res.json(req.variantCounts.view('public'));
  })
  .put(async (req, res) => {
    // Update db entry
    try {
      await req.variantCounts.update(req.body, {userId: req.user.id});
      return res.json(req.variantCounts.view('public'));
    } catch (error) {
      logger.error(`Unable to update variant counts ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Unable to update variant counts'},
      });
    }
  });

module.exports = router;
