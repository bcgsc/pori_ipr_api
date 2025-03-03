const HTTP_STATUS = require('http-status-codes');
const express = require('express');

const router = express.Router({mergeParams: true});

const db = require('../../models');
const logger = require('../../log');

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
router.use('/', async (req, res, next) => {
  let result;
  try {
    result = await db.models.tmburMutationBurden.findOne({
      where: {reportId: req.report.id},
    });
  } catch (error) {
    logger.error(`Unable to query Tmbur Mutation Burden for report ${req.report.ident} error: ${error}`);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: {message: `Unable to lookup Tmbur Mutation Burden for report ${req.report.ident}`},
    });
  }

  if (!result && req.method !== 'POST') {
    logger.error(`Unable to find Tmbur Mutation Burden for report ${req.report.ident}`);
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      error: {message: `Unable to find Tmbur Mutation Burden for report ${req.report.ident}`},
    });
  }
  // Add tmbur mutation burden to request
  req.tmburMutationBurden = result;
  return next();
});

// Handle requests for tmbur mutation burden by ident
router.route('/')
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
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Unable to update tmbur mutation burden'},
      });
    }
  })
  .post(async (req, res) => {
    // Validate request against schema
    try {
      validateAgainstSchema(createSchema, req.body);
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
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Unable to create tmbur mutation burden'},
      });
    }
  });

module.exports = router;
