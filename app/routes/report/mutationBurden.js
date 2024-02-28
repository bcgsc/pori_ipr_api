const HTTP_STATUS = require('http-status-codes');
const express = require('express');

const router = express.Router({mergeParams: true});

const db = require('../../models');
const logger = require('../../log');
const cache = require('../../cache');

const schemaGenerator = require('../../schemas/schemaGenerator');
const validateAgainstSchema = require('../../libs/validateAgainstSchema');
const {REPORT_CREATE_BASE_URI, REPORT_UPDATE_BASE_URI} = require('../../constants');

// Generate schema's
const createSchema = schemaGenerator(db.models.mutationBurden, {
  baseUri: REPORT_CREATE_BASE_URI,
});
const updateSchema = schemaGenerator(db.models.mutationBurden, {
  baseUri: REPORT_UPDATE_BASE_URI, nothingRequired: true,
});

// Middleware for mutation burden
router.param('mutationBurden', async (req, res, next, mutIdent) => {
  let result;
  try {
    result = await db.models.mutationBurden.findOne({
      where: {ident: mutIdent, reportId: req.report.id},
    });
  } catch (error) {
    logger.error(`Unable to lookup mutation burden error: ${error}`);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: {message: 'Unable to lookup the mutation burden'},
    });
  }

  if (!result) {
    logger.error(`Unable to find mutation burden for ${req.report.ident}`);
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      error: {message: `Unable to find mutation burden for ${req.report.ident}`},
    });
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
    // Validate request against schema
    try {
      validateAgainstSchema(updateSchema, req.body, false);
    } catch (error) {
      const message = `Error while validating mutation burden update request ${error}`;
      logger.error(message);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message}});
    }
    // Update db entry
    try {
      await req.mutationBurden.update(req.body, {userId: req.user.id});
      return res.json(req.mutationBurden.view('public'));
    } catch (error) {
      logger.error(`Unable to update mutation burden ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Unable to update mutation burden'},
      });
    }
  })
  .delete(async (req, res) => {
    // Soft delete mutation burden
    try {
      await req.mutationBurden.destroy();
      return res.status(HTTP_STATUS.NO_CONTENT).send();
    } catch (error) {
      logger.error(`Unable to remove mutation burden ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Unable to remove mutation burden'},
      });
    }
  });

// Handle requests for mutation summaries
router.route('/')
  .get(async (req, res) => {
    const key = `/reports/${req.report.ident}/mutation-burden`;

    try {
      const cacheResults = await cache.get(key);

      if (cacheResults) {
        res.type('json');
        return res.send(cacheResults);
      }
    } catch (error) {
      logger.error(`Error while checking cache for mutation burden data ${error}`);
    }

    try {
      const results = await db.models.mutationBurden.scope('public').findAll({
        where: {reportId: req.report.id},
      });

      if (key) {
        cache.set(key, JSON.stringify(results), 'EX', 14400);
      }

      return res.json(results);
    } catch (error) {
      logger.error(`Unable to lookup mutation burden ${req.report.ident} error: ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: `Unable to lookup the mutation burden for ${req.report.ident}`},
      });
    }
  })
  .post(async (req, res) => {
    // Validate request against schema
    try {
      await validateAgainstSchema(createSchema, req.body);
    } catch (error) {
      const message = `Error while validating mutation burden create request ${error}`;
      logger.error(message);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message}});
    }

    // Create new entry in db
    try {
      const result = await db.models.mutationBurden.create({
        ...req.body,
        reportId: req.report.id,
      });
      return res.status(HTTP_STATUS.CREATED).json(result.view('public'));
    } catch (error) {
      logger.error(`Unable to create mutation burden ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Unable to create mutation burden'},
      });
    }
  });

module.exports = router;
