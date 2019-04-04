// app/routes/genomic/somaticMutation.js
let express = require('express'),
  router = express.Router({mergeParams: true}),
  db = require(process.cwd() + '/app/models');

// Get all MAVIS summaries for a specified report
router.route('/')
  .get((req,res,next) => {

    let options = {
      where: {pog_report_id: req.report.id},
    };

    // Get all rows for this POG
    db.models.mavis.findAll(options).then(
      (result) => {
        res.json(result);
      },
      (error) => {
        console.log(error);
        res.status(500).json({error: {message: 'Unable to retrieve resource', code: 'failedMAVISSummarylookup'} });
      }
    );

  });

module.exports = router;