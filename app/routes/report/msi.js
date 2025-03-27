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
const createSchema = schemaGenerator(db.models.msi, {
  baseUri: REPORT_CREATE_BASE_URI,
});
const updateSchema = schemaGenerator(db.models.msi, {
  baseUri: REPORT_UPDATE_BASE_URI, nothingRequired: true,
});

// Middleware for MSI
router.param('msi', async (req, res, next, ident) => {
  let result;
  try {
    result = await db.models.msi.findOne({
      where: {ident, reportId: req.report.id},
      include: [
        {model: db.models.observedVariantAnnotations.scope('minimal'), as: 'observedVariantAnnotation'},
      ],
    });
  } catch (error) {
    logger.error(`Unable to lookup MSI data error: ${error}`);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to lookup MSI data'}});
  }

  if (!result) {
    logger.error(`Unable to find msi data for ${req.report.ident}`);
    return res.status(HTTP_STATUS.NOT_FOUND).json({error: {message: `Unable to find MSI data for ${req.report.ident}`}});
  }

  // Add MSI data to request
  req.msi = result;
  return next();
});

// Handle requests for MSI by ident
router.route('/:msi([A-z0-9-]{36})')
  .get((req, res) => {
    return res.json(req.msi.view('public'));
  })
  .put(async (req, res) => {
    // Validate request against schema
    try {
      validateAgainstSchema(updateSchema, req.body, false);
    } catch (error) {
      const message = `Error while validating MSI update request ${error}`;
      logger.error(message);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message}});
    }
    // Update db entry
    try {
      await req.msi.update(req.body, {userId: req.user.id});
      return res.json(req.msi.view('public'));
    } catch (error) {
      logger.error(`Unable to update MSI data ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to update MSI data'}});
    }
  })
  .delete(async (req, res) => {
    // Soft delete the entry
    try {
      await req.msi.destroy();
      return res.status(HTTP_STATUS.NO_CONTENT).send();
    } catch (error) {
      logger.error(`Unable to remove MSI data ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to remove MSI data'}});
    }
  });

// Handle requests for MSI's
router.route('/')
  .get(async (req, res) => {
    const key = `/reports/${req.report.ident}/msi`;

    try {
      const cacheResults = await cache.get(key);

      if (cacheResults) {
        res.type('json');
        return res.send(cacheResults);
      }
    } catch (error) {
      logger.error(`Error while checking cache for msi data ${error}`);
    }

    try {
      const results = await db.models.msi.scope('public').findAll({
        where: {reportId: req.report.id},
        include: [
          {
            model: db.models.observedVariantAnnotations,
            as: 'observedVariantAnnotation',
          },
        ],
      });

      if (key) {
        cache.set(key, JSON.stringify(results), 'EX', 14400);
      }

      return res.json(results);
    } catch (error) {
      logger.error(`Unable to lookup MSI for report ${req.report.ident} error: ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: `Unable to lookup the MSI for ${req.report.ident}`}});
    }
  })
  .post(async (req, res) => {
    // Validate request against schema
    try {
      await validateAgainstSchema(createSchema, req.body);
    } catch (error) {
      const message = `Error while validating MSI create request ${error}`;
      logger.error(message);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message}});
    }

    // Create new entry in db
    try {
      const result = await db.models.msi.create({
        ...req.body,
        reportId: req.report.id,
      });
      return res.status(HTTP_STATUS.CREATED).json(result.view('public'));
    } catch (error) {
      logger.error(`Unable to create MSI ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to create MSI'}});
    }
  });

module.exports = router;
