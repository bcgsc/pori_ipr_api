"use strict";

// app/routes/genomic/detailedGenomicAnalysis.js
let express = require('express'),
  router = express.Router({mergeParams: true}),
  db = require(process.cwd() + '/app/models'),
  _ = require('lodash'),
  acl = require(process.cwd() + '/app/middleware/acl'),
  loader = require(process.cwd() + '/app/loaders/detailedGenomicAnalysis/alterations');


// Register middleware
router.param('POG', require(process.cwd() + '/app/middleware/pog'));
router.param('report', require(process.cwd() + '/app/middleware/analysis_report'));

// Act on all reports
router.route('/')
  .get((req,res,next) => {

    // return all reports
    db.models.analysis_report.scope('public').findAll({
      include: [
        {model: db.models.patientInformation, as: 'patientInformation', attributes: { exclude: ['id', 'deletedAt', 'pog_id'] } },
        {model: db.models.tumourAnalysis.scope('public'), as: 'tumourAnalysis' },
        {model: db.models.user.scope('public'), as: 'createdBy'},
        {model: db.models.POG.scope('public'), as: 'pog' }
      ]
    }).then(
      (reports) => {
        res.json(reports);
      })
      .catch((err) => {
        console.log('Unable to lookup analysis reports', err);
        res.status(500).json({error: {message: 'Unable to lookup analysis reports.'}});
      });

  });

router.route('/:report')
  .get((req,res) => {
    let report = req.report.get();
    delete report.id;
    delete report.pog_id;
    delete report.createdBy_id;
    delete report.deletedAt;

    res.json(req.report);

  });


// NodeJS Module Return
module.exports = router;