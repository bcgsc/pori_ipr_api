// app/routes/genomic/detailedGenomicAnalysis.js
let express = require('express'),
  router = express.Router({mergeParams: true}),
  db = require(process.cwd() + '/app/models'),
  versionDatum = new require(process.cwd() + '/app/libs/VersionDatum');

let model = db.models.genomicEventsTherapeutic;

// Routing for event
router.route('/')
  .get((req,res,next) => {

    // Get all rows for this POG
    db.models.probe_test_information.scope('public').findOne({where: {pog_report_id: req.report.id}}).then(
      (result) => {
        res.json(result);
      },
      (error) => {
        console.log(error);
        res.status(500).json({error: {message: 'Unable to retrieve resource', code: 'failedGenomicEventsTherapeuticQuery'} });
      }
    );

  });

module.exports = router;
