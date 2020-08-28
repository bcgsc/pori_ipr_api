const HTTP_STATUS = require('http-status-codes');
const express = require('express');

const router = express.Router({mergeParams: true});

const db = require('../../models');
const logger = require('../../log');

const schemaGenerator = require('../../schemas/schemaGenerator');
const validateAgainstSchema = require('../../libs/validateAgainstSchema');
const {REPORT_UPDATE_BASE_URI} = require('../../constants');

// Generate schema
const updateSchema = schemaGenerator(db.models.mutationBurden, {
  baseUri: REPORT_UPDATE_BASE_URI, nothingRequired: true,
});

// Middleware for mutation burden
router.param('mutationBurden', async (req, res, next, mutIdent) => {
  let result;
  try {
    result = await db.models.mutationBurden.findOne({
      where: {ident: mutIdent},
    });
  } catch (error) {
    logger.error(`Unable to lookup mutation burden error: ${error}`);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to lookup the mutation burden'}});
  }

  if (!result) {
    logger.error(`Unable to find mutation burden for ${req.report.ident}`);
    return res.status(HTTP_STATUS.NOT_FOUND).json({error: {message: `Unable to find mutation burden for ${req.report.ident}`}});
  }

  // Add mutation burden to request
  req.mutationBurden = result;
  return next();
});

// Handle requests for mutation burden by ident
router.route('/:mutationBurden([A-z0-9-]{36})')
  .get((req, res) => {
    return res.json(req.mutationBurden.view('public'));
  })
  .put(async (req, res) => {
    // Update db entry
    const {mutationBurden} = req;
    // Validate request against schema
    try {
      validateAgainstSchema(updateSchema, req.body);
    } catch (err) {
      const message = `There was an error updating mutation burden ${err}`;
      logger.error(message);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message}});
    }
    // Update db entry
    try {
      await mutationBurden.update(req.body);
      return res.json(mutationBurden.view('public'));
    } catch (error) {
      logger.error(`Unable to update mutationBurden ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to update mutationBurden'}});
    }
  });

// Handle requests for mutation summaries
router.route('/')
  .get(async (req, res) => {
    try {
      const results = await db.models.mutationBurden.scope('public').findAll({
        where: {reportId: req.report.id},
      });
      return res.json(results);
    } catch (error) {
      logger.error(`Unable to lookup mutation burden for report ${req.report.ident} error: ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: `Unable to lookup the mutation burden for ${req.report.ident}`}});
    }
  });

module.exports = router;
