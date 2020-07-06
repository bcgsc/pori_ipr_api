const HTTP_STATUS = require('http-status-codes');
const express = require('express');
const db = require('../../../models');
const logger = require('../../../log');

const router = express.Router({mergeParams: true});

// Middleware for mutation summary
router.param('mutation', async (req, res, next, mutIdent) => {
  let result;
  try {
    result = await db.models.mutationSummary.findOne({
      where: {ident: mutIdent},
    });
  } catch (error) {
    logger.error(`Unable to lookup mutation summary error: ${error}`);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to lookup the mutation summary'}});
  }

  if (!result) {
    logger.error(`Unable to find mutation summary for ${req.report.ident}`);
    return res.status(HTTP_STATUS.NOT_FOUND).json({error: {message: `Unable to find mutation summary for ${req.report.ident}`}});
  }

  // Add mutation summary to request
  req.mutationSummary = result;
  return next();
});

// Handle requests for mutation summary by ident
router.route('/:mutation([A-z0-9-]{36})')
  .get((req, res) => {
    return res.json(req.mutationSummary.view('public'));
  })
  .put(async (req, res) => {
    // Update db entry
    try {
      await req.mutationSummary.update(req.body);
      return res.json(req.mutationSummary.view('public'));
    } catch (error) {
      logger.error(`Unable to update mutation summary ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to update mutation summary'}});
    }
  });

// Handle requests for mutation summaries
router.route('/')
  .get(async (req, res) => {
    try {
      const results = await db.models.mutationSummary.scope('public').findAll({
        where: {reportId: req.report.id},
      });
      return res.json(results);
    } catch (error) {
      logger.error(`Unable to lookup mutation summaries for report ${req.report.ident} error: ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: `Unable to lookup the mutation summaries for ${req.report.ident}`}});
    }
  });

module.exports = router;
