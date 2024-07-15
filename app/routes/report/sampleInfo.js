const HTTP_STATUS = require('http-status-codes');
const express = require('express');

const db = require('../../models');
const logger = require('../../log');

const router = express.Router({mergeParams: true});

const schemaGenerator = require('../../schemas/schemaGenerator');
const validateAgainstSchema = require('../../libs/validateAgainstSchema');
const {REPORT_UPDATE_BASE_URI, REPORT_CREATE_BASE_URI} = require('../../constants');
const {REPORT_EXCLUDE} = require('../../schemas/exclude');

// Generate schemas
const updateSchema = schemaGenerator(db.models.sampleInfo, {
  baseUri: REPORT_UPDATE_BASE_URI, nothingRequired: true,
});
const createSchema = schemaGenerator(db.models.sampleInfo, {
  baseUri: REPORT_CREATE_BASE_URI, exclude: REPORT_EXCLUDE,
});

// Middleware for sample info
router.param('sampleInfo', async (req, res, next, ident) => {
  let result;
  try {
    result = await db.models.sampleInfo.findOne({
      where: {
        reportId: req.report.id,
        ident,
      },
    });
  } catch (error) {
    logger.error(`Error while trying to find sample info ${error}`);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: {message: 'Error while trying to find sample info'},
    });
  }

  if (!result) {
    logger.error('Unable to locate sample info');
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      error: {message: 'Unable to locate sample info'},
    });
  }

  // Add sample info to request
  req.sampleInfo = result;
  return next();
});

// Handle requests for sample info
router.route('/:sampleInfo')
  .get((req, res) => {
    return res.json(req.sampleInfo.view('public'));
  })
  .put(async (req, res) => {
    // Validate request against schema
    try {
      validateAgainstSchema(updateSchema, req.body, false);
    } catch (error) {
      const message = `Error while validating sample info update request ${error}`;
      logger.error(message);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message}});
    }

    try {
      await req.sampleInfo.update(req.body, {userId: req.user.id});
      return res.json(req.sampleInfo.view('public'));
    } catch (error) {
      logger.error(`Unable to update sample info ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Unable to update sample info'},
      });
    }
  })
  .delete(async (req, res) => {
    // Soft delete the entry
    try {
      await req.sampleInfo.destroy();
      return res.status(HTTP_STATUS.NO_CONTENT).send();
    } catch (error) {
      logger.error(`Unable to remove sample info ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Unable to remove sample info'},
      });
    }
  });

router.route('/')
  .get(async (req, res) => {
    // Get all sample info for this report
    try {
      const results = await db.models.sampleInfo.scope('public').findAll({
        where: {
          reportId: req.report.id,
        },
      });

      return res.json(results);
    } catch (error) {
      logger.error(`Unable to retrieve sample info ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Unable to retrieve sample info'},
      });
    }
  })
  .post(async (req, res) => {
    try {
      // validate against the model
      validateAgainstSchema(createSchema, req.body);
    } catch (error) {
      const message = `There was an error validating the sample info create request ${error}`;
      logger.error(message);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message}});
    }

    try {
      // Add new sample info
      const result = await db.models.sampleInfo.create({
        ...req.body,
        reportId: req.report.id,
      });
      return res.status(HTTP_STATUS.CREATED).json(result.view('public'));
    } catch (error) {
      logger.error(`Unable to create new sample info ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Unable to create new sample info'},
      });
    }
  });

module.exports = router;
