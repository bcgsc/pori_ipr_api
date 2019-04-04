// app/routes/summary/variantCounts.js
let express = require('express'),
  router = express.Router({mergeParams: true}),
  db = require(process.cwd() + '/app/models'),
  logger = require(process.cwd() + '/app/libs/logger'),
  versionDatum = new require(process.cwd() + '/app/libs/VersionDatum');

// Middleware for Variant Counts
router.use('/', (req,res,next) => {

  // Get Mutation Summary for this POG
  db.models.summary_microbial.scope('public').findOne({ where: {pog_report_id: req.report.id}}).then(
    (result) => {
      // Not found
            // Found the patient information
      req.microbial = result;
      next();

    },
    (error) => {
      res.status(500).json({error: {message: 'Unable to lookup the microbial data for ' + req.POG.POGID + '.', code: 'failedMicrobialQuery'}});
      return new Error('Unable to query Variant Counts');
    }
  );

});

// Handle requests for Variant Counts
router.route('/')
  .get((req,res,next) => {
    // Get Patient History
    res.json(req.microbial);

  });

module.exports = router;
