const HTTP_STATUS = require('http-status-codes');
const express = require('express');
const multer = require('multer');

const router = express.Router({mergeParams: true});
const db = require('../../../models');

const logger = require('../../../log');

// Middleware for pathway analysis
router.use('/', async (req, res, next) => {
  try {
    // Get pathway analysis for this report
    const result = await db.models.pathwayAnalysis.findOne({
      where: {reportId: req.report.id},
    });

    // Not found is allowed!
    // Add pathway analysis to request
    req.pathwayAnalysis = result;
    return next();
  } catch (error) {
    logger.error(`Unable to lookup pathway analysis for report: ${req.report.ident} error: ${error}`);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: `Unable to lookup pathway analysis for report: ${req.report.ident}`}});
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
    // Updating?
    if (!req.pathwayAnalysis) {
      // Create
      const request = {
        pathway: req.files.pathway.data.toString(),
        reportId: req.report.id,
      };

      // Create entry
      try {
        const result = await db.models.pathwayAnalysis.create(request);
        return res.json(result.view('public'));
      } catch (error) {
        logger.error(`Unable to create pathway analysis entry ${error}`);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to create pathway analysis entry'}});
      }
    } else {
      // Updating
      const request = {
        pathway: req.files.pathway.data.toString(),
      };

      // Update db entry
      try {
        await req.pathwayAnalysis.update(request);
        return res.json(req.pathwayAnalysis.view('public'));
      } catch (error) {
        logger.error(`Unable to update pathway analysis ${error}`);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to update pathway analysis'}});
      }
    }
  })

  .post((req, res) => {
    // Accept file upload
    multer({
      limits: {
        files: 1,
      },
      onFileUploadComplete: async (file) => {
        // Is there an existing entry?
        if (req.pathwayAnalysis === null) {
          req.body.reportId = req.report.id;
          req.body.pathway = file;

          // Create new entry
          try {
            const result = await db.models.pathwayAnalysis.create(req.body);
            return res.status(HTTP_STATUS.CREATED).json(result.view('public'));
          } catch (error) {
            logger.error(`Unable to create pathway analysis ${error}`);
            return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to create pathway analysis'}});
          }
        }
      },
    });
  });

module.exports = router;
