const express = require('express');
const _ = require('lodash');
const db = require('../../app/models');
const ACL = require('../../app/middleware/acl');
const Report = require('../../app/libs/structures/analysis_report');

const router = express.Router({mergeParams: true});

// Register middleware
router.param('POG', require('../../app/middleware/pog'));
router.param('report', require('../../app/middleware/analysis_report'));

// Act on all reports
router.route('/')
  .get(async (req, res) => {
    // Check user permission and filter by project
    const access = new ACL(req, res);
    try {
      const projectAccess = await access.getProjectAccess();
      const opts = {where: {}};

      opts.include = [
        {model: db.models.patientInformation, as: 'patientInformation', attributes: {exclude: ['id', 'deletedAt', 'pog_id']}},
        {model: db.models.tumourAnalysis.scope('public'), as: 'tumourAnalysis'},
        {model: db.models.user.scope('public'), as: 'createdBy'},
        {
          model: db.models.POG.scope('public'),
          as: 'pog',
          include: [
            {model: db.models.project, as: 'projects', attributes: {exclude: ['id', 'createdAt', 'updatedAt', 'deletedAt']}},
          ],
        },
        {model: db.models.pog_analysis.scope('public'), as: 'analysis'},
        {
          model: db.models.analysis_reports_user,
          as: 'users',
          separate: true,
          include: [
            {model: db.models.user.scope('public'), as: 'user'},
          ],
        },
      ];

      // Where clauses
      opts.where = {};

      // Check for types
      if (req.query.type === 'probe') opts.where.type = 'probe';
      if (req.query.type === 'genomic') opts.where.type = 'genomic';

      if (req.query.project) { // check access if filtering
        if (_.includes(_.map(projectAccess, 'name'), req.query.project)) {
          opts.where['$pog.projects.name$'] = req.query.project;
        } else {
          return res.status(403).json({error: {message: 'You do not have access to the selected project'}});
        }
      } else { // otherwise filter by accessible projects
        opts.where['$pog.projects.ident$'] = {$in: _.map(projectAccess, 'ident')};
      }

      if (req.query.searchText) {
        opts.where.$or = {
          '$patientInformation.tumourType$': {$ilike: `%${req.query.searchText}%`},
          '$patientInformation.biopsySite$': {$ilike: `%${req.query.searchText}%`},
          '$patientInformation.physician$': {$ilike: `%${req.query.searchText}%`},
          '$patientInformation.caseType$': {$ilike: `%${req.query.searchText}%`},
          '$tumourAnalysis.diseaseExpressionComparator$': {$ilike: `%${req.query.searchText}%`},
          '$tumourAnalysis.ploidy$': {$ilike: `%${req.query.searchText}%`},
          '$pog.POGID$': {$ilike: `%${req.query.searchText}%`},
        };
      }

      // States
      if (req.query.states) {
        const states = req.query.states.split(',');
        opts.where.state = {$in: states};
      }

      if (!req.query.states) {
        opts.where.state = {$not: ['archived', 'nonproduction', 'reviewed']};
      }

      // Are we filtering on POGUser relationship?
      if (req.query.all !== 'true' || req.query.role) {
        const userFilter = {model: db.models.analysis_reports_user, as: 'ReportUserFilter', where: {}};
        // Don't search all if the requestee has also asked for role filtering
        if (req.query.all !== 'true' || req.query.role) userFilter.where.user_id = req.user.id;
        if (req.query.role) userFilter.where.role = req.query.role; // Role filtering

        opts.include.push(userFilter);
      }

      opts.order = [[{model: db.models.POG, as: 'pog'}, 'POGID', 'desc']];

      const reports = await db.models.analysis_report.scope('public').findAll(opts);

      if (!req.query.paginated) return res.json(reports);

      // limits and offsets are causing the query to break due to the public scope and subqueries
      // i.e. fields are not available for joining onto subquery selection
      // dealing w/ applying the pagination here
      const limit = parseInt(req.query.limit, 10) || 25; // Gotta parse those ints because javascript is javascript!
      const offset = parseInt(req.query.offset, 10) || 0;

      // apply limit and offset to results
      const start = offset;


      const finish = offset + limit;
      const paginatedReports = reports.slice(start, finish);

      return res.json({total: reports.length, reports: paginatedReports});
    } catch (err) {
      return res.status(500).json({error: {message: err.message}});
    }
  });

router.route('/:report')
  .get((req, res) => {
    const report = req.report.get();
    delete report.id;
    delete report.pog_id;
    delete report.createdBy_id;
    delete report.deletedAt;

    res.json(req.report);
  })
  .put(async (req, res) => {
    const pastState = req.report.state;

    // Update Report
    if (req.body.state) {
      if (['ready', 'active', 'presented', 'archived', 'nonproduction', 'reviewed', 'uploaded', 'signedoff'].indexOf(req.body.state) === -1) return res.status(400).json({error: {message: 'The provided report state is not valid'}});
      req.report.state = req.body.state;
    }

    try {
      await req.report.save();

      // Add history record
      // Create DataHistory entry
      const dh = {
        type: 'change',
        pog_id: req.report.pog_id,
        pog_report_id: req.report.id,
        table: 'pog_analysis_reports',
        model: 'analysis_report',
        entry: req.report.ident,
        previous: pastState,
        new: req.report.state,
        user_id: req.user.id,
        comment: 'N/A',
      };
      db.models.pog_analysis_reports_history.create(dh);

      return res.json(req.report);
    } catch (err) {
      return res.status(500).json({error: {message: 'Unable to update report.'}});
    }
  });

/**
 * Report User Binding
 */
router.route('/:report/user')
  .post(async (req, res) => {
    if (!req.body.user) return res.status(400).json({error: {message: 'No user provided for binding'}});
    if (!req.body.role) return res.status(400).json({error: {message: 'No role provided for binding'}});

    const report = new Report(req.report);

    try {
      const bind = await report.bindUser(req.body.user, req.body.role, req.user);
      return res.json(bind);
    } catch (err) {
      return res.status(500).json({error: err});
    }
  })
  .delete(async (req, res) => {
    if (!req.body.user) return res.status(400).json({error: {message: 'No user provided for binding'}});
    if (!req.body.role) return res.status(400).json({error: {message: 'No role provided for binding'}});

    const report = new Report(req.report);

    try {
      const unbind = await report.unbindUser(req.body.user, req.body.role);
      return res.json(unbind);
    } catch (err) {
      return res.status(500).json({error: err});
    }
  });

module.exports = router;
