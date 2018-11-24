const express = require('express');
const db = require('../../../../../app/models');
const versionDatum = require('../../../../../app/libs/VersionDatum');

const router = express.Router({mergeParams: true});

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
    try {
      // Update DB Version for Entry
      const version = await versionDatum(db.models.tumourAnalysis, req.tumourAnalysis, req.body, req.user, req.body.comment);
      return res.json(version.data.create);
    } catch (err) {
      return res.status(500).json({error: {message: 'Unable to version the resource', code: 'failedTumourAnalysisVersion'}});
    }
  });

module.exports = router;
