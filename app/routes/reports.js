"use strict";

// app/routes/genomic/detailedGenomicAnalysis.js
let express = require('express'),
  router = express.Router({mergeParams: true}),
  db = require(process.cwd() + '/app/models'),
  _ = require('lodash'),
  acl = require(process.cwd() + '/app/middleware/acl'),
  loader = require(process.cwd() + '/app/loaders/detailedGenomicAnalysis/alterations'),
  Report = require(process.cwd() + '/app/libs/structures/analysis_report');


// Register middleware
router.param('POG', require(process.cwd() + '/app/middleware/pog'));
router.param('report', require(process.cwd() + '/app/middleware/analysis_report'));

// Act on all reports
router.route('/')
  .get((req,res,next) => {

    let opts = { where: {}};

    opts.include = [
      {model: db.models.patientInformation, as: 'patientInformation', attributes: { exclude: ['id', 'deletedAt', 'pog_id'] } },
      {model: db.models.tumourAnalysis.scope('public'), as: 'tumourAnalysis' },
      {model: db.models.user.scope('public'), as: 'createdBy'},
      {model: db.models.POG.scope('public'), as: 'pog' },
      {model: db.models.pog_analysis.scope('public'), as: 'analysis' },
      {model: db.models.analysis_reports_user, as: 'users', separate: true, include: [
        {model: db.models.user.scope('public'), as: 'user'}
      ]}
    ];

    // Where clauses
    opts.where = {};

    // Check for types
    if(req.query.type === 'probe') opts.where.type = 'probe';
    if(req.query.type === 'genomic') opts.where.type = 'genomic';


    // States
    if(req.query.states) {
      let states = req.query.states.split(',');
      opts.where.state = {$in: states};
    }

    if(!req.query.states) {
      opts.where.state = { $not: ['archived', 'nonproduction', 'reviewed']};
    }

    // Are we filtering on POGUser relationship?
    if(req.query.all !== 'true' || req.query.role) {
      let userFilter = {model: db.models.analysis_reports_user, as: 'ReportUserFilter', where: {}};
      // Don't search all if the requestee has also asked for role filtering
      if(req.query.all !== 'true' || req.query.role) userFilter.where.user_id = req.user.id;
      if(req.query.role) userFilter.where.role = req.query.role; // Role filtering

      opts.include.push(userFilter);
    }

    // return all reports
    db.models.analysis_report.scope('public').findAll(opts).then(
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

  })
  .put((req,res) => {

    let pastState = req.report.state;

    // Update Report
    if(req.body.state) {
      if(['ready', 'active', 'presented', 'archived', 'nonproduction', 'reviewed', 'uploaded', 'signedoff'].indexOf(req.body.state) === -1) return res.status(400).json({error: { message: 'The provided report state is not valid'}});
      req.report.state = req.body.state;
    }

    // Update report
    req.report.save().then(
      (result) => {
        res.json(req.report);

        // Add history record
        // Create DataHistory entry
        let dh = {
          type: 'change',
          pog_id: req.report.pog_id,
          pog_report_id: req.report.id,
          table: "pog_analysis_reports",
          model: "analysis_report",
          entry: req.report.ident,
          previous: pastState,
          new: req.report.state,
          user_id: req.user.id,
          comment: 'N/A'
        };
        db.models.pog_analysis_reports_history.create(dh);

      },
      (err) => {
        res.status(500).json({error: {message: 'Unable to update report.'}});
      }
    )


  });

router.route('/:report/user')
  .post((req, res, next) => {

    if(!req.body.user) return res.status(400).json({error: {message: 'No user provided for binding'}});
    if(!req.body.role) return res.status(400).json({error: {message: 'No role provided for binding'}});

    let report = new Report(req.report);

    report.bindUser(req.body.user, req.body.role, req.user).then(
      (result) => {
        res.json(result);
      },
      (err) => {
        let code = 400;
        if(err.code === 'userNotFound') code = 404;

        res.status(code).json({error: err});
      }
    );


  })
  .delete((req, res, next) => {

    console.log(req);

    if(!req.body.user) return res.status(400).json({error: {message: 'No user provided for binding'}});
    if(!req.body.role) return res.status(400).json({error: {message: 'No role provided for binding'}});

    let report = new Report(req.report);

    report.unbindUser(req.body.user, req.body.role).then(
      (result) => {
        console.log('Response from unbind', result);
        res.json(result);
      },
      (err) => {
        let code = 400;
        if(err.code === 'userNotFound') code = 404;
        if(err.code === 'noBindingFound') code = 404;

        res.status(code).json({error: err});
      }
    )
  });

// NodeJS Module Return
module.exports = router;