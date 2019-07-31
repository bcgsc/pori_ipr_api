const express = require('express');
const multer = require('multer');

const router = express.Router({mergeParams: true});
const db = require('../../../../models');

const logger = require('../../../../../lib/log');

// Middleware for Analyst Comments
router.use('/', async (req, res, next) => {
  try {
    // Get Patient Information for this POG
    const result = await db.models.pathwayAnalysis.findOne({
      where: {
        pog_report_id: req.report.id,
      },
      attributes: {exclude: ['id', 'deletedAt']},
    });

    // Not found is allowed!
    // Found the patient information
    req.pathwayAnalysis = result;
    return next();
  } catch (error) {
    logger.error(`Unable to lookup pathway analysis for ${req.POG.POGID} error: ${error}`);
    return res.status(500).json({error: {message: `Unable to lookup pathway analysis for ${req.POG.POGID}`, code: 'failedPathwayAnaylsisQuery'}});
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
        pog_report_id: req.report.id,
      };

      // Create entry
      try {
        const result = await db.models.pathwayAnalysis.create(request);
        return res.json(result);
      } catch (error) {
        logger.error(`Unable to create pathway analysis entry ${error}`);
        return res.status(500).json({error: {message: 'Unable to create pathway analysis entry', code: 'failedAnalystCommentVersion'}});
      }
    } else {
      // Updating
      const request = {
        pathway: req.files.pathway.data.toString(),
        pog_report_id: req.report.id,
      };
      // Remove current
      req.pathwayAnalysis.pog_id = req.POG.id;
      req.pathwayAnalysis.pog_report_id = req.report.id;

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
          id, pog_id, pog_report_id, deletedAt, ...publicModel
        } = dataValues;

        return res.json(publicModel);
      } catch (error) {
        logger.error(`Unable to update pathway analysis ${error}`);
        return res.status(500).json({error: {message: 'Unable to update pathway analysis', code: 'failedAnalystCommentVersion'}});
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
          req.body.pog_id = req.POG.id;
          req.body.pog_report_id = req.report.id;
          req.body.pathway = file;

          // Create new entry
          try {
            const result = await db.models.pathwayAnalysis.create(req.body);
            return res.json(result);
          } catch (error) {
            logger.error(`Unable to create pathway analysis ${error}`);
            return res.status(500).json({error: {message: 'Unable to create pathway analysis', code: 'failedPathwayAnaylsisCreate'}});
          }
        }
      },
    });
  });

module.exports = router;
