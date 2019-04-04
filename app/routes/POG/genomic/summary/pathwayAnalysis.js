'use strict';

// app/routes/genomic/detailedGenomicAnalysis.js
const express = require('express');

const router = express.Router({mergeParams: true});
const db = require(`${process.cwd()}/app/models`);
const multer = require('multer');

const versionDatum = require(`${process.cwd()}/app/libs/VersionDatum`);


// Middleware for Analyst Comments
router.use('/', async (req, res, next) => {

  try {
    // Get Patient Information for this POG
    const result = await db.models.pathwayAnalysis.findOne({where: {pog_report_id: req.report.id}, order: [['dataVersion', 'DESC']], attributes: {exclude: ['id', 'deletedAt']}});
    // Not found is allowed!
    // Found the patient information
    req.pathwayAnalysis = result;
    next();
  } catch (error) {
    console.log('Unable to query pathway analysis', error);
    res.status(500).json({error: {message: `Unable to lookup the pathway analysis for ${req.POG.POGID}.`, code: 'failedPathwayAnaylsisQuery'}});
    res.end();
  }
});

// Handle requests for alterations
router.route('/')
  .get((req, res) => {
    // Get Patient History
    res.json(req.pathwayAnalysis);
  })
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
        const result = await db.models.pathwayAnalysis.create(request);
        res.json(result);
      } catch (error) {
        console.log('Unable to create Pathway Analysis entry', error);
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
        // Update DB Version for Entry
        const result = await versionDatum(db.models.pathwayAnalysis, req.pathwayAnalysis, request, req.user);
        res.json(result.data.create);
      } catch (error) {
        console.log(error);
        res.status(500).json({error: {message: 'Unable to version the resource', code: 'failedAnalystCommentVersion'}});
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
            const result = await db.models.pathwayAnalysis.create(req.body);
            res.json(result);
          } catch (error) {
            console.log(error);
            res.status(500).json({error: {message: 'Unable to version the resource', code: 'failedPathwayAnaylsisCreate'}});
          }
        }
      },
    });
  });

module.exports = router;
