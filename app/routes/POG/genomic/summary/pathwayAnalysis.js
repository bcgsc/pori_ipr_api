const express = require('express');
const multer = require('multer');
const db = require('../../../../../app/models');
const versionDatum = require('../../../../../app/libs/VersionDatum');

const router = express.Router({mergeParams: true});

// Middleware for pathway analysis
router.use('/', async (req, res, next) => {
  try {
    // Get pathway analysis for this report
    const pathwayAnalysis = await db.models.pathwayAnalysis.findOne({where: {pog_report_id: req.report.id}, order: '"dataVersion" DESC', attributes: {exclude: ['id', 'deletedAt']}});

    if (!pathwayAnalysis) throw new Error('notFoundError'); // no pathway analysis found

    // pathway analysis found, set request param
    req.pathwayAnalysis = pathwayAnalysis;
    return next();
  } catch (err) {
    // set default return status and message
    let returnStatus = 500;
    let returnMessage = err.message;

    if (err.message === 'notFoundError') { // return 404 error - pathway analysis could not be found
      returnStatus = 404;
      returnMessage = 'pathway analysis could not be found';
    }

    return res.status(returnStatus).json({error: {message: `An error occurred while trying to find pathway analysis for patient ${req.POG.POGID}: ${returnMessage}`}});
  }
});

// Handle requests for pathway analysis
router.route('/')
  .get((req, res) => res.json(req.pathwayAnalysis))
  .put(async (req, res) => {
    // Updating?
    if (!req.pathwayAnalysis) {
      // Create
      const request = {
        pathway: req.files.pathway.data.toString(),
        pog_report_id: req.report.id,
        dataversion: 0,
      };

      try {
        // Create entry
        const pathwayAnalysis = await db.models.pathwayAnalysis.create(request);
        return res.json(pathwayAnalysis);
      } catch (err) {
        return res.status(500).json({error: {message: 'Unable to createPathwayAnalysis', code: 'failedCreatePathwayAnalysis'}});
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

      try {
        const version = await versionDatum(db.models.pathwayAnalysis, req.pathwayAnalysis, request, req.user);
        return res.json(version.data.create);
      } catch (err) {
        return res.status(500).json({error: {message: 'Unable to version the resource', code: 'failedAnalystCommentVersion'}});
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
          req.body.dataVersion = 0;
          req.body.pog_id = req.POG.id;
          req.body.pog_report_id = req.report.id;
          req.body.pathway = file;

          try {
            // Create new entry
            const pathwayAnalysis = await db.models.pathwayAnalysis.create(req.body);
            return res.json(pathwayAnalysis);
          } catch (err) {
            return res.status(500).json({error: {message: 'Unable to version the resource', code: 'failedPathwayAnaylsisCreate'}});
          }
        } else {
          //
          return res.json();
        }
      },
    });
  });

module.exports = router;
