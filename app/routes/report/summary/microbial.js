const HTTP_STATUS = require('http-status-codes');
const express = require('express');
const db = require('../../../models');
const logger = require('../../../log');
const cache = require('../../../cache');

const router = express.Router({mergeParams: true});

const schemaGenerator = require('../../../schemas/schemaGenerator');
const validateAgainstSchema = require('../../../libs/validateAgainstSchema');
const {REPORT_CREATE_BASE_URI, REPORT_UPDATE_BASE_URI} = require('../../../constants');

// Generate schema's
const createSchema = schemaGenerator(db.models.summary_microbial, {
  baseUri: REPORT_CREATE_BASE_URI,
});
const updateSchema = schemaGenerator(db.models.summary_microbial, {
  baseUri: REPORT_UPDATE_BASE_URI, nothingRequired: true,
});

// Middleware for microbial summary
router.param('microbial', async (req, res, next, micIdent) => {
  let result;
  try {
    result = await db.models.summary_microbial.findOne({
      where: {ident: micIdent, reportId: req.report.id},
    });
  } catch (error) {
    logger.error(`Error while trying to get microbial data for ident: ${micIdent} report: ${req.report.ident} error: ${error}`);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Error while trying to get microbial data'}});
  }

  if (!result) {
    logger.error('Unable to find microbial data');
    return res.status(HTTP_STATUS.NOT_FOUND).json({error: {message: 'Unable to find microbial data'}});
  }

  // Add microbial summary to request
  req.microbial = result;
  return next();
});

// Handle requests for a single microbial summary
router.route('/:microbial([A-z0-9-]{36})')
  .get((req, res) => {
    return res.json(req.microbial.view('public'));
  })
  .put(async (req, res) => {
    // Validate request against schema
    try {
      validateAgainstSchema(updateSchema, req.body, false);
    } catch (error) {
      const message = `Error while validating microbial update request ${error}`;
      logger.error(message);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message}});
    }

    // Update db entry
    try {
      await req.microbial.update(req.body, {userId: req.user.id});
      return res.json(req.microbial.view('public'));
    } catch (error) {
      logger.error(`Unable to update microbial data ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to update microbial data'}});
    }
  })
  .delete(async (req, res) => {
    // Soft delete the entry
    try {
      await req.microbial.destroy();
      return res.status(HTTP_STATUS.NO_CONTENT).send();
    } catch (error) {
      logger.error(`Error while trying to delete microbial data ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Error while trying to delete microbial data'}});
    }
  });

// Handle requests for all report microbial data
router.route('/')
  .get(async (req, res) => {
    const key = `/reports/${req.report.ident}/summary/microbial`;

    try {
      const cacheResults = await cache.get(key);

      if (cacheResults) {
        res.type('json');
        return res.send(cacheResults);
      }
    } catch (error) {
      logger.error(`Error while checking cache for microbial data ${error}`);
    }

    try {
      const results = await db.models.summary_microbial.scope('public').findAll({
        where: {reportId: req.report.id},
      });

      if (key) {
        cache.set(key, JSON.stringify(results), 'EX', 5400);
      }

      return res.status(HTTP_STATUS.OK).json(results);
    } catch (error) {
      logger.error(`Unable to get all report microbial data ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to get all report microbial data'}});
    }
  })
  .post(async (req, res) => {
    // Validate request against schema
    try {
      validateAgainstSchema(createSchema, req.body);
    } catch (error) {
      const message = `Error while validating microbial create request ${error}`;
      logger.error(message);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message}});
    }

    // Add new microbial data to report
    try {
      req.body.reportId = req.report.id;

      const result = await db.models.summary_microbial.create(req.body);
      return res.status(HTTP_STATUS.CREATED).json(result.view('public'));
    } catch (error) {
      logger.error(`Unable to create microbial data entry ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to create microbial data entry'}});
    }
  });


module.exports = router;
