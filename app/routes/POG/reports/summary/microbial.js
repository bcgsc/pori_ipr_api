const HTTP_STATUS = require('http-status-codes');
const express = require('express');
const db = require('../../../../models');
const logger = require('../../../../log');

const router = express.Router({mergeParams: true});

// Middleware for Variant Counts
router.use('/', async (req, res, next) => {
  // Get Mutation Summary for this POG
  let result;
  try {
    result = await db.models.summary_microbial.scope('public').findOne({where: {reportId: req.report.id}});
  } catch (error) {
    logger.error(`Unable to lookup microbial data for ${req.POG.POGID} error: ${error}`);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: `Unable to lookup the microbial data for ${req.POG.POGID}`, code: 'failedMicrobialQuery'}});
  }

  req.microbial = result;
  return next();
});

// Handle requests for Variant Counts
router.route('/')
  .get((req, res) => {
    // Get Patient History
    return res.json(req.microbial);
  });

module.exports = router;
