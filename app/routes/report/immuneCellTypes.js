const HTTP_STATUS = require('http-status-codes');
const express = require('express');

const router = express.Router({mergeParams: true});

const db = require('../../models');
const logger = require('../../log');
const cache = require('../../cache');

const schemaGenerator = require('../../schemas/schemaGenerator');
const validateAgainstSchema = require('../../libs/validateAgainstSchema');
const {REPORT_UPDATE_BASE_URI, REPORT_CREATE_BASE_URI} = require('../../constants');
const {REPORT_EXCLUDE} = require('../../schemas/exclude');

// Generate schema's
const createSchema = schemaGenerator(db.models.immuneCellTypes, {
  baseUri: REPORT_CREATE_BASE_URI, exclude: REPORT_EXCLUDE,
});
const updateSchema = schemaGenerator(db.models.immuneCellTypes, {
  baseUri: REPORT_UPDATE_BASE_URI, nothingRequired: true,
});

// Middleware
router.param('ict', async (req, res, next, ictIdent) => {
  let result;
  try {
    result = await db.models.immuneCellTypes.findOne({
      where: {ident: ictIdent, reportId: req.report.id},
    });
  } catch (error) {
    logger.error(`Unable to get immune cell type ${error}`);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: {message: 'Unable to get immune cell type'},
    });
  }

  if (!result) {
    logger.error('Unable to locate immune cell type');
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      error: {message: 'Unable to locate immune cell type'},
    });
  }

  // Add immune cell type to request
  req.immuneCellType = result;
  return next();
});

// Handle requests for specific immune cell type
router.route('/:ict([A-z0-9-]{36})')
  .get((req, res) => {
    return res.json(req.immuneCellType.view('public'));
  })
  .put(async (req, res) => {
    // Validate request against schema
    try {
      validateAgainstSchema(updateSchema, req.body, false);
    } catch (error) {
      logger.error(`Error while validating immune cell type update request ${error}`);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        error: {message: `Error while validating immune cell type update request ${error}`},
      });
    }

    // Update db entry
    try {
      await req.immuneCellType.update(req.body, {userId: req.user.id});
      return res.json(req.immuneCellType.view('public'));
    } catch (error) {
      logger.error(`Unable to update immune cell type ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Unable to update immune cell type'},
      });
    }
  })
  .delete(async (req, res) => {
    // Soft delete the entry
    try {
      await req.immuneCellType.destroy();
      return res.status(HTTP_STATUS.NO_CONTENT).send();
    } catch (error) {
      logger.error(`Unable to remove immune cell type ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Unable to remove immune cell type'},
      });
    }
  });

// Routing requests for all immune cell types
router.route('/')
  .get(async (req, res) => {
    const key = `/reports/${req.report.ident}/immune-cell-types`;

    try {
      const cacheResults = await cache.get(key);

      if (cacheResults) {
        res.type('json');
        return res.send(cacheResults);
      }
    } catch (error) {
      logger.error(`Error while checking cache for immune cell types ${error}`);
    }

    // Get all immune cell types for this report
    try {
      const results = await db.models.immuneCellTypes.scope('public').findAll({
        where: {reportId: req.report.id},
      });

      if (key) {
        cache.set(key, JSON.stringify(results), 'EX', 14400);
      }

      return res.json(results);
    } catch (error) {
      logger.error(`Unable to retrieve immune cell types ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Unable to retrieve immune cell types'},
      });
    }
  })
  .post(async (req, res) => {
    try {
      // validate against the model
      validateAgainstSchema(createSchema, req.body);
    } catch (error) {
      const message = `There was an error validating the Immune Cell Type create request ${error}`;
      logger.error(message);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message}});
    }

    try {
      // Add new Immune Cell Type to report
      const result = await db.models.immuneCellTypes.create({
        ...req.body,
        reportId: req.report.id,
      });
      return res.status(HTTP_STATUS.CREATED).json(result.view('public'));
    } catch (error) {
      logger.error(`Unable to create new Immune Cell Type ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Unable to create new Immune Cell Type'},
      });
    }
  });

module.exports = router;
