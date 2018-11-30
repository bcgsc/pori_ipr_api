const express = require('express');
const db = require('../../../../../app/models');
const reportChangeHistory = require('../../../../../app/libs/reportChangeHistory');

const router = express.Router({mergeParams: true});
const {logger} = process;

// Middleware for Tumour Analysis
router.use('/', async (req, res, next) => {
  try {
    // Get tumour analysis for this report
    const tumourAnalysis = await db.models.tumourAnalysis.scope('public').findOne({where: {pog_report_id: req.report.id}});

    if (!tumourAnalysis) throw new Error('notFoundError'); // no tumour analysis found

    // tumour analysis found, set request param
    req.tumourAnalysis = tumourAnalysis;
    return next();
  } catch (err) {
    // set default return status and message
    let returnStatus = 500;
    let returnMessage = err.message;

    if (err.message === 'notFoundError') { // return 404 error - tumour analysis could not be found
      returnStatus = 404;
      returnMessage = 'tumour analysis could not be found';
    }

    return res.status(returnStatus).json({error: {message: `An error occurred while trying to find tumour analysis for patient ${req.POG.POGID}: ${returnMessage}`}});
  }
});

// Handle requests for Tumour Analysis
router.route('/')
  .get((req, res) => res.json(req.tumourAnalysis))
  .put(async (req, res) => {
    // specify editable fields
    const editable = ['tumourContent', 'ploidy', 'normalExpressionComparator', 'diseaseExpressionComparator', 'subtyping', 'tcgaColor', 'mutationSignature'];
    const editableErr = [];

    const updateTumourAnalysis = {}; // set up object for updating fields
    const oldTumourAnalysis = req.tumourAnalysis;
    const newTumourAnalysis = req.body;
    // TODO: Fix client to not pass in the fields below in request (should not be editable)
    delete newTumourAnalysis.createdAt;
    delete newTumourAnalysis.updatedAt;

    try {
      for (const field in newTumourAnalysis) {
        if (newTumourAnalysis[field]) {
          const fieldValue = newTumourAnalysis[field];
          if (fieldValue !== oldTumourAnalysis[field] && field !== 'comment') {
            if (!editable.includes(field)) editableErr.push(field); // check if user is editing a non-editable field
            updateTumourAnalysis[field] = fieldValue;
          }
        }
      }

      if (editableErr.length > 0) return res.status(400).json({error: {message: `The following tumour analysis fields are not editable: ${editableErr.join(', ')}`}});

      // Update entry
      const update = await db.models.tumourAnalysis.update(updateTumourAnalysis, {where: {ident: oldTumourAnalysis.ident}, returning: true});
      const updatedTumourAnalysis = update[1][0];

      // Record change history for each field updated
      for (const field in updateTumourAnalysis) {
        if (updateTumourAnalysis[field]) {
          // setup JSON objects to be stored in text field if necessary
          let oldTumourAnalysisValue = oldTumourAnalysis[field];
          let newTumourAnalysisValue = updateTumourAnalysis[field];
          if (typeof oldTumourAnalysisValue === 'object') oldTumourAnalysisValue = JSON.stringify(oldTumourAnalysisValue);
          if (typeof newTumourAnalysisValue === 'object') newTumourAnalysisValue = JSON.stringify(newTumourAnalysisValue);
          const changeHistorySuccess = await reportChangeHistory.recordUpdate(updatedTumourAnalysis.ident, 'tumourAnalysis', field, oldTumourAnalysisValue, newTumourAnalysisValue, req.user.id, updatedTumourAnalysis.pog_report_id, 'tumour analysis', req.body.comment);

          if (!changeHistorySuccess) {
            logger.error(`Failed to record report change history for updating tumour analysis with ident ${updatedTumourAnalysis.ident}.`);
          }
        }
      }

      return res.json(updatedTumourAnalysis);
    } catch (err) {
      const errMessage = `An error occurred while updating tumour analysis: ${err.message}`; // set up error message
      logger.error(errMessage); // log error
      return res.status(500).json({error: {message: errMessage}}); // return error to client
    }
  });

module.exports = router;
