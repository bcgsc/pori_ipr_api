const express = require('express');
const multer = require('multer');
const db = require('../../../../../app/models');
const reportChangeHistory = require('../../../../../app/libs/reportChangeHistory');

const router = express.Router({mergeParams: true});
const {logger} = process;

// Middleware for pathway analysis
router.use('/', async (req, res, next) => {
  try {
    // Get pathway analysis for this report
    const pathwayAnalysis = await db.models.pathwayAnalysis.findOne({where: {pog_report_id: req.report.id}, order: '"dataVersion" DESC', attributes: {exclude: ['id', 'deletedAt']}});

    // TODO: Once PUT and POST requests have been correctly separated from each other - this should return a 404 if not found
    // Note that client will likely need to be updated to handle the 404 error
    if (!pathwayAnalysis) {
      req.pathwayAnalysis = null;
      return next(); // don't throw error if none found
    }

    // pathway analysis found, set request param
    req.pathwayAnalysis = pathwayAnalysis;
    return next();
  } catch (err) {
    // set default return status and message
    const returnStatus = 500;
    const returnMessage = err.message;

    return res.status(returnStatus).json({error: {message: `An error occurred while trying to find pathway analysis for patient ${req.POG.POGID}: ${returnMessage}`}});
  }
});

// Handle requests for pathway analysis
router.route('/')
  .get((req, res) => res.json(req.pathwayAnalysis))
  .put(async (req, res) => {
    // TODO: PUT requests should not handle both creation and updates - move creation to POST request.
    const oldPathway = req.pathwayAnalysis;
    const newPathway = {
      pathway: req.files.pathway.data.toString(),
    };

    // If pathway analysis doesn't already exist, create new record
    if (!oldPathway) {
      try {
        newPathway.pog_report_id = req.report.id;
        newPathway.pog_id = req.POG.id;

        // Create entry
        const pathwayAnalysis = await db.models.pathwayAnalysis.create(newPathway);

        // record change history
        const changeHistorySuccess = await reportChangeHistory.recordCreate(pathwayAnalysis.ident, 'pathwayAnalysis', req.user.id, pathwayAnalysis.pog_report_id, 'pathway analysis');

        if (!changeHistorySuccess) {
          logger.error(`Failed to record report change history for creating pathway analysis with ident ${pathwayAnalysis.ident}.`);
        }

        return res.json(pathwayAnalysis);
      } catch (err) {
        return res.status(500).json({error: {message: 'Unable to createPathwayAnalysis', code: 'failedCreatePathwayAnalysis'}});
      }
    } else {
      try {
        // Update entry
        const update = await db.models.pathwayAnalysis.update(newPathway, {where: {ident: oldPathway.ident}, returning: true});
        const updatedPathway = update[1][0];

        // Record change history for field updated
        const changeHistorySuccess = await reportChangeHistory.recordUpdate(updatedPathway.ident, 'analystComments', 'pathway', oldPathway.pathway, updatedPathway.pathway, req.user.id, updatedPathway.pog_report_id, 'pathway analysis', req.body.comment);

        if (!changeHistorySuccess) {
          logger.error(`Failed to record report change history for updating pathway analysis with ident ${updatedPathway.ident}.`);
        }

        return res.json(updatedPathway);
      } catch (err) {
        const errMessage = `An error occurred while updating pathway analysis: ${err.message}`; // set up error message
        logger.error(errMessage); // log error
        return res.status(500).json({error: {message: errMessage}}); // return error to client
      }
    }
  });

module.exports = router;
