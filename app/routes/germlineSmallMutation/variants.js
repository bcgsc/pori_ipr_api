const HTTP_STATUS = require('http-status-codes');
const express = require('express');

const router = express.Router({mergeParams: true});

const db = require('../../models');
const logger = require('../../log');

const schemaGenerator = require('../../schemas/schemaGenerator');
const validateAgainstSchema = require('../../libs/validateAgainstSchema');
const {GERMLINE_CREATE_BASE_URI, GERMLINE_UPDATE_BASE_URI} = require('../../constants');
const {GERMLINE_EXCLUDE} = require('../../schemas/exclude');

// Generate schema's
const createSchema = schemaGenerator(db.models.germline_small_mutation_variant, {
  baseUri: GERMLINE_CREATE_BASE_URI, exclude: GERMLINE_EXCLUDE,
});
const updateSchema = schemaGenerator(db.models.germline_small_mutation_variant, {
  baseUri: GERMLINE_UPDATE_BASE_URI, include: ['hidden', 'patient_history', 'family_history'], nothingRequired: true,
});


// Middleware for germline variants
router.param('variant', async (req, res, next, ident) => {
  let result;
  try {
    result = await db.models.germline_small_mutation_variant.findOne({
      where: {ident, germline_report_id: req.report.id},
    });
  } catch (error) {
    logger.error(`Error while trying to get germline report variant ${error}`);
    return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message: 'Error while trying to get germline report variant'}});
  }

  if (!result) {
    logger.error('Unable to find germline report variant');
    return res.status(HTTP_STATUS.NOT_FOUND).json({error: {message: 'Unable to find germline report variant'}});
  }

  req.variant = result;
  return next();
});


// Handles requests for a single germline variant
router.route('/:variant')
  .get((req, res) => {
    return res.json(req.variant.view('public'));
  })
  .put(async (req, res) => {
    try {
      // validate against the model
      validateAgainstSchema(updateSchema, req.body, false);
    } catch (error) {
      const message = `There was an error validating the germline variant update request ${error}`;
      logger.error(message);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message}});
    }

    // Update db entry
    try {
      await req.variant.update(req.body);
      return res.json(req.variant.view('public'));
    } catch (error) {
      logger.error(`Unable to update germline variant ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to update germline variant'}});
    }
  })
  .delete(async (req, res) => {
    // Soft delete germline variant
    try {
      await req.variant.destroy();
      return res.status(HTTP_STATUS.NO_CONTENT).send();
    } catch (error) {
      logger.error(`There was an error while trying to remove the requested germline variant ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({message: 'Error while trying to remove the requested germline variant'});
    }
  });


// Handles requests for all germline variants for a report
router.route('/')
  .get(async (req, res) => {
    try {
      const results = await db.models.germline_small_mutation_variant.scope('public').findAll({
        where: {germline_report_id: req.report.id},
      });
      return res.json(results);
    } catch (error) {
      logger.error(`Unable to retrieve germline variants ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to retrieve germline variants'}});
    }
  })
  .post(async (req, res) => {
    try {
      // validate against the model
      validateAgainstSchema(createSchema, req.body);
    } catch (error) {
      const message = `There was an error validating the germline variant create request ${error}`;
      logger.error(message);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message}});
    }

    try {
      // Add new variant to germline report
      const result = await db.models.germline_small_mutation_variant.create({
        ...req.body,
        germline_report_id: req.report.id,
      });
      return res.status(HTTP_STATUS.CREATED).json(result.view('public'));
    } catch (error) {
      logger.error(`Unable to create new germline variant ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to create new germline variant'}});
    }
  });


module.exports = router;
