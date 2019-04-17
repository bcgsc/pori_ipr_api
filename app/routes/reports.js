"use strict";

// app/routes/genomic/detailedGenomicAnalysis.js
let express = require('express'),
  router = express.Router({mergeParams: true}),
  db = require(process.cwd() + '/app/models'),
  _ = require('lodash'),
  loader = require(process.cwd() + '/app/loaders/detailedGenomicAnalysis/alterations'),
  Report = require(process.cwd() + '/app/libs/structures/analysis_report'),
  Acl = require('../middleware/acl');

const {logger} = process;


// Register middleware
router.param('POG', require(process.cwd() + '/app/middleware/pog'));
router.param('report', require(process.cwd() + '/app/middleware/analysis_report'));

// Act on all reports
router.route('/')
  .get((req,res,next) => {

    // Check user permission and filter by project
    let access = new Acl(req, res);
    access.getProjectAccess().then(
      (projectAccess) => {
        let opts = { where: {}};
        
        opts.include = [
          {model: db.models.patientInformation, as: 'patientInformation', attributes: { exclude: ['id', 'deletedAt', 'pog_id'] }},
          {model: db.models.tumourAnalysis.scope('public'), as: 'tumourAnalysis' },
          {model: db.models.user.scope('public'), as: 'createdBy'},
          {model: db.models.POG.scope('public'), as: 'pog', include: [
            {model: db.models.project, as: 'projects', attributes: {exclude: ['id', 'createdAt', 'updatedAt', 'deletedAt']}}
          ]},
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

        if (req.query.project) { // check access if filtering
          if(_.includes(_.map(projectAccess, 'name'), req.query.project)) {
            opts.where['$pog.projects.name$'] = req.query.project;
          } else {
            return res.status(403).json({error: {message: 'You do not have access to the selected project'}});
          }
        } else { // otherwise filter by accessible projects
          opts.where['$pog.projects.ident$'] = {$in: _.map(projectAccess, 'ident')};
        }

        if(req.query.searchText) opts.where['$or'] = {
          '$patientInformation.tumourType$': {$ilike: `%${req.query.searchText}%`},
          '$patientInformation.biopsySite$': {$ilike: `%${req.query.searchText}%`},
          '$patientInformation.physician$': {$ilike: `%${req.query.searchText}%`},
          '$patientInformation.caseType$': {$ilike: `%${req.query.searchText}%`},
          '$tumourAnalysis.diseaseExpressionComparator$': {$ilike: `%${req.query.searchText}%`},
          '$tumourAnalysis.ploidy$': {$ilike: `%${req.query.searchText}%`},
          '$pog.POGID$': {$ilike: `%${req.query.searchText}%`},
        };

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
        
        opts.order = [
          ['state', 'desc'],
          [{model: db.models.POG, as: 'pog'}, 'POGID', 'desc'],
        ];
        
        let reports;
        
        // return all reports
        db.models.analysis_report.scope('public').findAll(opts)
          .then((results) => {
            reports = results;
            if(!req.query.paginated) return res.json(reports);
            
            // limits and offsets are causing the query to break due to the public scope and subqueries
            // i.e. fields are not available for joining onto subquery selection
            // dealing w/ applying the pagination here
            let limit = parseInt(req.query.limit) || 25; // Gotta parse those ints because javascript is javascript!
            let offset = parseInt(req.query.offset) || 0;

            // apply limit and offset to results
            let start = offset,
                finish = offset + limit;
            let paginatedReports = reports.slice(start, finish);
            
            return res.json({total: reports.length, reports: paginatedReports});
            
          })
          .catch((err) => {
            console.log('Unable to lookup analysis reports', err);
            res.status(500).json({error: {message: 'Unable to lookup analysis reports.'}});
          });
      },
      (err) => {
        res.status(500).json({error: {message: err.message, code: err.code}});
      }
    );

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

/**
 * Report User Binding
 */
router.route('/:report/user')
  .post((req, res, next) => {

    const access = new Acl(req, res);
    if (!access.check()) {
      logger.error(`User doesn't have correct permissions to add a user binding ${req.user.username}`);
      return res.status(403).json({error: {message: 'User doesn\'t have correct permissions to add a user binding'}});
    }

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

    const access = new Acl(req, res);
    if (!access.check()) {
      logger.error(`User doesn't have correct permissions to remove a user binding ${req.user.username}`);
      return res.status(403).json({error: {message: 'User doesn\'t have correct permissions to remove a user binding'}});
    }

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