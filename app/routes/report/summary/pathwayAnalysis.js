const HTTP_STATUS = require('http-status-codes');
const express = require('express');
const isSvg = require('is-svg');

const router = express.Router({mergeParams: true});
const db = require('../../../models');
const logger = require('../../../log');

const schemaGenerator = require('../../../schemas/schemaGenerator');
const validateAgainstSchema = require('../../../libs/validateAgainstSchema');
const {REPORT_CREATE_BASE_URI, REPORT_UPDATE_BASE_URI} = require('../../../constants');

// Generate schema's
const createSchema = schemaGenerator(db.models.pathwayAnalysis, {baseUri: REPORT_CREATE_BASE_URI});
const updateSchema = schemaGenerator(db.models.pathwayAnalysis, {
  baseUri: REPORT_UPDATE_BASE_URI, nothingRequired: true,
});

// Middleware for pathway analysis
router.use('/', async (req, res, next) => {
  try {
    // Get pathway analysis for this report and add it to the request
    // Not found/null is allowed!
    req.pathwayAnalysis = await db.models.pathwayAnalysis.findOne({
      where: {reportId: req.report.id},
    });
    return next();
  } catch (error) {
    logger.error(`Unable to lookup pathway analysis for report: ${req.report.ident} error: ${error}`);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: {message: `Unable to lookup pathway analysis for report: ${req.report.ident}`},
    });
  }
});

// Handle requests for alterations
router.route('/')
  .get((req, res) => {
    if (req.pathwayAnalysis) {
      return res.json(req.pathwayAnalysis.view('public'));
    }
    return res.json(null);
  })
  .put(async (req, res) => {
    // Check for pathway analysis to update
    if (!req.pathwayAnalysis) {
      logger.error('There is no pathway analysis to update');
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        error: {message: 'There is no pathway analysis to update'},
      });
    }

    // Check for pathway analysis file
    if (req.files && req.files.pathway) {
      // Check that file is an svg
      if (!isSvg(req.files.pathway.data)) {
        logger.error('Pathway must be an svg');
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          error: {message: 'Pathway must be an svg'},
        });
      }

      // Add svg data to request
      req.body.pathway = req.files.pathway.data.toString();
    }

    // Resolve a legend given by ident to its fk before validating,
    // the update schema only knows about legendId
    if (req.body.legendIdent !== undefined) {
      const {legendIdent} = req.body;
      delete req.body.legendIdent;

      let legend;
      try {
        legend = await db.models.legend.findOne({where: {ident: legendIdent}});
      } catch (error) {
        logger.error(`Unable to lookup legend ${legendIdent} error: ${error}`);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
          error: {message: 'Unable to lookup legend'},
        });
      }

      if (!legend) {
        logger.error(`Unable to find legend ${legendIdent}`);
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          error: {message: 'Unable to find the requested legend'},
        });
      }

      req.body.legendId = legend.id;
    }

    try {
      // validate against the model
      validateAgainstSchema(updateSchema, req.body, false);
    } catch (error) {
      const message = `There was an error validating the pathway analysis update request ${error}`;
      logger.error(message);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message}});
    }

    // Update db entry
    try {
      await req.pathwayAnalysis.update(req.body, {userId: req.user.id});
      return res.json(req.pathwayAnalysis.view('public'));
    } catch (error) {
      logger.error(`Unable to update pathway analysis ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to update pathway analysis'}});
    }
  })
  .delete(async (req, res) => {
    // Check for pathway analysis to delete
    if (!req.pathwayAnalysis) {
      logger.error('There is no pathway analysis to delete');
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        error: {message: 'There is no pathway analysis to delete'},
      });
    }

    // Soft delete pathway analysis
    try {
      await req.pathwayAnalysis.destroy();
      return res.status(HTTP_STATUS.NO_CONTENT).send();
    } catch (error) {
      logger.error(`Error while trying to remove pathway analysis ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        message: 'Error while trying to remove pathway analysis',
      });
    }
  })
  .post(async (req, res) => {
    // Check for pathway analysis
    if (req.pathwayAnalysis) {
      logger.error('There is already a pathway analysis for this report');
      return res.status(HTTP_STATUS.CONFLICT).json({
        error: {message: 'There is already a pathway analysis for this report'},
      });
    }

    // Check for pathway analysis file
    if (req.files && req.files.pathway) {
      // Check that file is an svg
      if (!isSvg(req.files.pathway.data)) {
        logger.error('Pathway must be an svg');
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          error: {message: 'Pathway must be an svg'},
        });
      }

      // Add svg data to request
      req.body.pathway = req.files.pathway.data.toString();
    }

    try {
      // validate against the model
      validateAgainstSchema(createSchema, req.body);
    } catch (error) {
      const message = `There was an error validating the pathway analysis create request ${error}`;
      logger.error(message);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message}});
    }

    // Add reports id to request
    req.body.reportId = req.report.id;

    // Associate the default legend image if none was explicitly provided
    if (!req.body.legendId) {
      try {
        const defaultLegend = await db.models.legend.findOne({where: {default: true}});
        if (defaultLegend) {
          req.body.legendId = defaultLegend.id;
        }
      } catch (error) {
        logger.error(`Unable to lookup default legend error: ${error}`);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
          error: {message: 'Unable to lookup default legend'},
        });
      }
    }

    try {
      const result = await db.models.pathwayAnalysis.create(req.body);
      return res.status(HTTP_STATUS.CREATED).json(result.view('public'));
    } catch (error) {
      logger.error(`Unable to create pathway analysis ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Unable to create pathway analysis'},
      });
    }
  });

module.exports = router;
