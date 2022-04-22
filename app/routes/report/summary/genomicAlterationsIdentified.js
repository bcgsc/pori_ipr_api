const HTTP_STATUS = require('http-status-codes');
const express = require('express');

const router = express.Router({mergeParams: true});
const db = require('../../../models');
const logger = require('../../../log');
const cache = require('../../../cache');

const schemaGenerator = require('../../../schemas/schemaGenerator');
const validateAgainstSchema = require('../../../libs/validateAgainstSchema');
const {REPORT_CREATE_BASE_URI, REPORT_UPDATE_BASE_URI} = require('../../../constants');

// Generate schemas
const createSchema = schemaGenerator(db.models.genomicAlterationsIdentified, {
  baseUri: REPORT_CREATE_BASE_URI,
});
const updateSchema = schemaGenerator(db.models.genomicAlterationsIdentified, {
  baseUri: REPORT_UPDATE_BASE_URI, nothingRequired: true,
});

// Middleware for genomic alterations
router.param('alteration', async (req, res, next, altIdent) => {
  let result;
  try {
    result = await db.models.genomicAlterationsIdentified.findOne({
      where: {ident: altIdent, reportId: req.report.id},
    });
  } catch (error) {
    logger.error(`Unable to get genomic alterations ${error}`);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: {message: 'Unable to get genomic alterations'},
    });
  }

  if (!result) {
    logger.error('Unable to locate genomic alterations');
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      error: {message: 'Unable to locate genomic alterations'},
    });
  }

  // Add genomic alteration to request
  req.alteration = result;
  return next();
});

// Handle requests for alterations
router.route('/:alteration([A-z0-9-]{36})')
  .get((req, res) => {
    return res.json(req.alteration.view('public'));
  })
  .put(async (req, res) => {
    // Validate request against schema
    try {
      validateAgainstSchema(updateSchema, req.body, false);
    } catch (error) {
      const message = `Error while validating genomic alterations update request ${error}`;
      logger.error(message);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message}});
    }

    try {
      await req.alteration.update(req.body, {userId: req.user.id});
      return res.json(req.alteration.view('public'));
    } catch (error) {
      logger.error(`Unable to update genomic alterations ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Unable to update genomic alterations'},
      });
    }
  })
  .delete(async (req, res) => {
    // Soft delete the entry
    try {
      await req.alteration.destroy();
      return res.status(HTTP_STATUS.NO_CONTENT).send();
    } catch (error) {
      logger.error(`Unable to remove genomic alterations ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Unable to remove genomic alterations'},
      });
    }
  });

// Routing for Alteration
router.route('/')
  .get(async (req, res) => {
    // Get all the genomic alterations for this report
    const key = `/reports/${req.report.ident}/summary/genomic-alterations-identified`;

    try {
      const cacheResults = await cache.get(key);

      if (cacheResults) {
        res.type('json');
        return res.send(cacheResults);
      }
    } catch (error) {
      logger.error(`Error while checking cache for genomic alterations ${error}`);
    }

    try {
      const results = await db.models.genomicAlterationsIdentified.scope('public').findAll({
        where: {
          reportId: req.report.id,
        },
      });

      if (key) {
        cache.set(key, JSON.stringify(results), 'EX', 14400);
      }

      return res.json(results);
    } catch (error) {
      logger.error(`Unable to get all genomic alterations identified ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Unable to get all genomic alterations identified'},
      });
    }
  })
  .post(async (req, res) => {
    // Validate request against schema
    try {
      await validateAgainstSchema(createSchema, req.body);
    } catch (error) {
      const message = `Error while validating genomic alterations create request ${error}`;
      logger.error(message);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message}});
    }

    try {
      req.body.reportId = req.report.id;

      const result = await db.models.genomicAlterationsIdentified.create(req.body);
      return res.status(HTTP_STATUS.CREATED).json(result.view('public'));
    } catch (error) {
      logger.error(`Unable to create genomic alteration entry ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Unable to create genomic alteration entry'},
      });
    }
  });

module.exports = router;
