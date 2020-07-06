const HTTP_STATUS = require('http-status-codes');
const express = require('express');
const db = require('../../../models');
const logger = require('../../../log');

const router = express.Router({mergeParams: true});

// Middleware for microbial summary
router.use('/', async (req, res, next) => {
  try {
    // Add microbial summary to request
    req.microbial = await db.models.summary_microbial.findOne({
      where: {reportId: req.report.id},
    });
    return next();
  } catch (error) {
    logger.error(`Unable to lookup microbial data for report ${req.report.ident} error: ${error}`);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: `Unable to lookup the microbial data for report ${req.report.ident}`}});
  }
});

// Handle requests for microbial summary
router.route('/')
  .get((req, res) => {
    if (req.microbial) {
      return res.json(req.microbial.view('public'));
    }
    return res.json(null);
  });

module.exports = router;
