const HTTP_STATUS = require('http-status-codes');
const express = require('express');

const router = express.Router({mergeParams: true});

const db = require('../../models');
const logger = require('../../log');
const cache = require('../../cache');
const {generateKey} = require('../../libs/cacheFunctions');

const schemaGenerator = require('../../schemas/schemaGenerator');
const validateAgainstSchema = require('../../libs/validateAgainstSchema');
const {REPORT_UPDATE_BASE_URI} = require('../../constants');

// Generate schema
const updateSchema = schemaGenerator(db.models.mutationSignature, {
  baseUri: REPORT_UPDATE_BASE_URI, nothingRequired: true,
});


router.param('mutationSignature', async (req, res, next, ident) => {
  let result;
  try {
    result = await db.models.mutationSignature.findOne({
      where: {ident, reportId: req.report.id},
    });
  } catch (error) {
    logger.log(`Error while trying to get mutation signature ${error}`);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Error while trying to get mutation signature'}});
  }

  if (!result) {
    logger.error(`Unable to locate mutation signature (${ident})`);
    return res.status(HTTP_STATUS.NOT_FOUND).json({error: {message: `Unable to locate mutation signature (${ident})`}});
  }

  req.mutationSignature = result;
  return next();
});

router.route('/')
  .get(async (req, res) => {
    const key = generateKey(`/reports/${req.report.ident}/mutation-signatures`, req.query);

    try {
      const cacheResults = await cache.get(key);

      if (cacheResults) {
        res.type('json');
        return res.send(cacheResults);
      }
    } catch (error) {
      logger.error(`Error while checking cache for mutation signatures ${error}`);
    }

    // Get all mutation signatures for this report
    try {
      const results = await db.models.mutationSignature.scope('public').findAll({
        where: {
          reportId: req.report.id,
          ...((req.query.selected !== undefined) ? {selected: req.query.selected} : {}),
        },
      });

      if (key) {
        cache.set(key, JSON.stringify(results), 'EX', 5400);
      }

      return res.json(results);
    } catch (error) {
      logger.error(`Unable to retrieve mutation signatures ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to retrieve mutation signatures'}});
    }
  });

router.route('/:mutationSignature([A-z0-9-]{36})')
  .get((req, res) => {
    return res.json(req.mutationSignature.view('public'));
  })
  .put(async (req, res) => {
    const {mutationSignature} = req;
    // Validate request against schema
    try {
      validateAgainstSchema(updateSchema, req.body, false);
    } catch (err) {
      const message = `There was an error updating mutation signature ${err}`;
      logger.error(message);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message}});
    }
    // Update db entry
    try {
      await mutationSignature.update(req.body);
      return res.json(mutationSignature.view('public'));
    } catch (error) {
      logger.error(`Unable to update mutationSignature ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to update mutationSignature'}});
    }
  });


module.exports = router;
