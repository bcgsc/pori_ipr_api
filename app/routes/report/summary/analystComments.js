const HTTP_STATUS = require('http-status-codes');
const express = require('express');
const validateAgainstSchema = require('../../../libs/validateAgainstSchema');
const schemaGenerator = require('../../../schemas/schemaGenerator');
const {REPORT_UPDATE_BASE_URI} = require('../../../constants');

const router = express.Router({mergeParams: true});
const db = require('../../../models');

const logger = require('../../../log');
const {sanitizeHtml} = require('../../../libs/helperFunctions');

// Generate schema's
const updateSchema = schemaGenerator(db.models.analystComments, {baseUri: REPORT_UPDATE_BASE_URI, nothingRequired: true});

// Middleware for analyst comments
router.use('/', async (req, res, next) => {
  // Get Patient Information for report
  // Not found is allowed!
  try {
    req.analystComments = await db.models.analystComments.findOne({
      where: {reportId: req.report.id},
    });
    return next();
  } catch (error) {
    logger.error(`Unable to query analyst comments for ${req.report.patientId} with error ${error}`);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: `Unable to query analyst comments for ${req.report.patientId}`}});
  }
});

// Handle requests for analyst comments
router.route('/')
  .get((req, res) => {
    if (req.analystComments) {
      return res.json(req.analystComments.view('public'));
    }
    return res.json(null);
  })
  .put(async (req, res) => {
    // First Comments
    if (!req.analystComments) {
      req.body.reportId = req.report.id;

      // Create new entry
      try {
        req.analystComments = await db.models.analystComments.create(req.body);
        return res.json(req.analystComments.view('public'));
      } catch (error) {
        logger.error(`Unable to create new analysis comments ${error}`);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to create new analysis comments'}});
      }
    } else {
      // Update DB Version for Entry
      if (req.analystComments) {
        req.analystComments = sanitizeHtml(req.analystComments);
      }
      try {
        try {
          // validate against the model
          validateAgainstSchema(updateSchema, req.body, false);
        } catch (err) {
          const message = `There was an error updating the analyst comment ${err}`;
          logger.error(message);
          return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message}});
        }
        await req.analystComments.update(req.body, {userId: req.user.id});
        return res.json(req.analystComments.view('public'));
      } catch (error) {
        logger.error(`Unable to update analysis comments ${error}`);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to update analysis comments'}});
      }
    }
  })
  .delete(async (req, res) => {
    if (!req.analystComments) {
      logger.error('Unable to find analysis comments to delete');
      return res.status(HTTP_STATUS.NOT_FOUND).json({error: {message: 'Unable to find analysis comments to delete'}});
    }

    try {
      await req.analystComments.destroy();
      return res.status(HTTP_STATUS.NO_CONTENT).send();
    } catch (error) {
      logger.error(`Unable to delete analysis comments ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to delete analysis comments'}});
    }
  });

module.exports = router;
