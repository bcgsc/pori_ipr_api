const HTTP_STATUS = require('http-status-codes');
const express = require('express');
const multer = require('multer');

const router = express.Router({mergeParams: true});
const db = require('../../../models');

const logger = require('../../../log');

// Middleware for Analyst Comments
router.use('/', async (req, res, next) => {
  try {
    // Get pathway analysis for this report
    const result = await db.models.pathwayAnalysis.findOne({
      where: {
        reportId: req.report.id,
      },
      attributes: {exclude: ['id', 'deletedAt']},
    });

    // Not found is allowed!
    // Found the patient information
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
    // Get Patient History
    return res.json(req.pathwayAnalysis);
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
        return res.json(result);
      } catch (error) {
        logger.error(`Unable to create pathway analysis entry ${error}`);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to create pathway analysis entry'}});
      }
    } else {
      // Updating
      const request = {
        pathway: req.files.pathway.data.toString(),
        reportId: req.report.id,
      };
      // Remove current
      req.pathwayAnalysis.reportId = req.report.id;

      // Update DB Version for Entry
      try {
        const result = await db.models.pathwayAnalysis.update(request, {
          where: {
            ident: req.pathwayAnalysis.ident,
          },
          individualHooks: true,
          paranoid: true,
          returning: true,
        });

        // Get updated model data from update
        const [, [{dataValues}]] = result;

        // Remove id's and deletedAt properties from returned model
        const {
          id, reportId, deletedAt, ...publicModel
        } = dataValues;

        return res.json(publicModel);
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
            return res.json(result);
          } catch (error) {
            logger.error(`Unable to create pathway analysis ${error}`);
            return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to create pathway analysis'}});
          }
        }
      },
    });
  });

module.exports = router;
