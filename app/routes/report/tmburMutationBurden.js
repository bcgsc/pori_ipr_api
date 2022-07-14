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
const createSchema = schemaGenerator(db.models.tmburMutationBurden, {
  baseUri: REPORT_CREATE_BASE_URI,
});
const updateSchema = schemaGenerator(db.models.tmburMutationBurden, {
  baseUri: REPORT_UPDATE_BASE_URI, nothingRequired: true,
});

// Middleware for tmbur mutation burden
router.param('tmburMutationBurden', async (req, res, next, mutIdent) => {
  let result;
  try {
    result = await db.models.tmburMutationBurden.findOne({
      where: {ident: mutIdent, reportId: req.report.id},
    });
  } catch (error) {
    logger.error(`Unable to lookup tmbur mutation burden error: ${error}`);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to lookup the tmbur mutation burden'}});
  }

  if (!result) {
    logger.error(`Unable to find tmbur mutation burden for ${req.report.ident}`);
    return res.status(HTTP_STATUS.NOT_FOUND).json({error: {message: `Unable to find tmbur mutation burden for ${req.report.ident}`}});
  }

  // Add tmbur mutation burden to request
  req.tmburMutationBurden = result;
  return next();
});

// Handle requests for tmbur mutation burden by ident
router.route('/:tmburMutationBurden([A-z0-9-]{36})')
  .get((req, res) => {
    return res.json(req.tmburMutationBurden.view('public'));
  })
  .put(async (req, res) => {
    // Validate request against schema
    try {
      validateAgainstSchema(updateSchema, req.body, false);
    } catch (error) {
      const message = `Error while validating tmbur mutation burden update request ${error}`;
      logger.error(message);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message}});
    }
    // Update db entry
    try {
      await req.tmburMutationBurden.update(req.body, {userId: req.user.id});
      return res.json(req.tmburMutationBurden.view('public'));
    } catch (error) {
      logger.error(`Unable to update tmbur mutation burden ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to update tmbur mutation burden'}});
    }
  });

// Handle requests for tmbur mutation summaries
router.route('/')
  .get(async (req, res) => {
    const key = `/reports/${req.report.ident}/tmbur-mutation-burden`;

    try {
      const cacheResults = await cache.get(key);

      if (cacheResults) {
        res.type('json');
        return res.send(cacheResults);
      }
    } catch (error) {
      logger.error(`Error while checking cache for tmbur mutation burden data ${error}`);
    }

    try {
      const results = await db.models.tmburMutationBurden.scope('public').findAll({
        where: {reportId: req.report.id},
      });

      if (key) {
        cache.set(key, JSON.stringify(results), 'EX', 14400);
      }

      return res.json(results);
    } catch (error) {
      logger.error(`Unable to lookup tmbur mutation burden for report ${req.report.ident} error: ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: `Unable to lookup the tmbur mutation burden for ${req.report.ident}`},
      });
    }
  })
  .post(async (req, res) => {
    // Validate request against schema
    try {
      await validateAgainstSchema(createSchema, req.body);
    } catch (error) {
      const message = `Error while validating tmbur mutation burden create request ${error}`;
      logger.error(message);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message}});
    }

    // Create new entry in db
    try {
      const result = await db.models.tmburMutationBurden.create({
        ...req.body,
        reportId: req.report.id,
      });
      return res.status(HTTP_STATUS.CREATED).json(result.view('public'));
    } catch (error) {
      logger.error(`Unable to create tmbur mutation burden ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to create tmbur mutation burden'}});
    }
  });

module.exports = router;
