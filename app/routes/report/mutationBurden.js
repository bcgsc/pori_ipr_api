const HTTP_STATUS = require('http-status-codes');
const express = require('express');
const db = require('../../models');
const logger = require('../../log');
const validateAgainstSchema = require('../../libs/validateAgainstSchema');
const updateSchema = require('../../schemas/report/updateMutationBurden');

const router = express.Router({mergeParams: true});

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
    try {
      // validate against the model
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
