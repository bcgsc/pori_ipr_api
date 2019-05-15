const express = require('express');
const _ = require('lodash');
const db = require('../models');
const Acl = require('../middleware/acl');
const Report = require('../libs/structures/analysis_report');
const logger = require('../../lib/log');

const pogMiddleware = require('../middleware/pog');
const reportMiddleware = require('../middleware/analysis_report');

const router = express.Router({mergeParams: true});

const DEFAULT_PAGE_LIMIT = 25;
const DEFAULT_PAGE_OFFSET = 0;


// Register middleware
router.param('POG', pogMiddleware);
router.param('report', reportMiddleware);

// Act on all reports
router.route('/')
  .get(async (req, res) => {
    // Check user permission and filter by project
    const access = new Acl(req, res);
    let projectAccess = null;
    try {
      projectAccess = await access.getProjectAccess();
      logger.info('Successfully got project access');
    } catch (error) {
      logger.error(error);
      return res.status(500).json({error: {message: error.message, code: error.code}});
    }
    const opts = {
      where: {},
      include: [
        {model: db.models.patientInformation, as: 'patientInformation', attributes: {exclude: ['id', 'deletedAt', 'pog_id']}},
        {model: db.models.tumourAnalysis.scope('public'), as: 'tumourAnalysis'},
        {model: db.models.user.scope('public'), as: 'createdBy'},
        {model: db.models.POG.scope('public'), as: 'pog', include:
          [
            {model: db.models.project, as: 'projects', attributes: {exclude: ['id', 'createdAt', 'updatedAt', 'deletedAt']}},
          ],
        },
        {model: db.models.pog_analysis.scope('public'), as: 'analysis'},
        {model: db.models.analysis_reports_user, as: 'users', separate: true, include:
          [
            {model: db.models.user.scope('public'), as: 'user'},
          ],
        },
      ],
    };

    // Check for types
    if (req.query.type === 'probe') {
      opts.where.type = 'probe';
    } else if (req.query.type === 'genomic') {
      opts.where.type = 'genomic';
    }

    if (req.query.project) { // check access if filtering
      // Get the names of the projects the user has access to
      const projectAccessNames = projectAccess.map((project) => {
        return project.name;
      });
      if (projectAccessNames.includes(req.query.project)) {
        opts.where['$pog.projects.name$'] = req.query.project;
      } else {
        return res.status(403).json({error: {message: 'You do not have access to the selected project'}});
      }
    } else {
      // otherwise filter by accessible projects
      const projectAccessIdent = projectAccess.map((project) => {
        return project.ident;
      });
      opts.where['$pog.projects.ident$'] = {$in: projectAccessIdent};
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
    } else {
      opts.where.state = {$not: ['archived', 'nonproduction', 'reviewed']};
    }

    // Are we filtering on POGUser relationship?
    if (req.query.all !== 'true' || req.query.role) {
      const userFilter = {model: db.models.analysis_reports_user, as: 'ReportUserFilter', where: {}};
      userFilter.where.user_id = req.user.id;
      if (req.query.role) {
        userFilter.where.role = req.query.role; // Role filtering
      }
      opts.include.push(userFilter);
    }

    opts.order = [
      ['state', 'desc'],
      [{model: db.models.POG, as: 'pog'}, 'POGID', 'desc'],
    ];

    try {
      // return all reports
      let reports = await db.models.analysis_report.scope('public').findAll(opts);
      if (req.query.paginated) {
        // limits and offsets are causing the query to break due to the public scope and subqueries
        // i.e. fields are not available for joining onto subquery selection
        // dealing w/ applying the pagination here
        const limit = parseInt(req.query.limit, 10) || DEFAULT_PAGE_LIMIT;
        const offset = parseInt(req.query.offset, 10) || DEFAULT_PAGE_OFFSET;

        // apply limit and offset to results
        const start = offset;
        const finish = offset + limit;
        reports = reports.slice(start, finish);
      }
      if (req.query.sort) {
        const mapping = {
          patientID: 'pog.POGID',
          analysisBiopsy: 'analysis.analysis_biopsy',
          tumourType: 'patientInformation.tumourType',
          physician: 'patientInformation.physician',
          state: 'state',
          caseType: 'patientInformation.caseType',
          alternateIdentifier: 'analysis.pog.alternate_identifier',
        };

        let {sort} = req.query;
        sort = sort.split(',');
        const columns = sort.map(sortGroup => mapping[sortGroup.split(':')[0]]);
        const orders = sort.map(sortGroup => sortGroup.split(':')[1]);
        reports = _.orderBy(reports, columns, orders);
      }

      return res.json({total: reports.length, reports});
    } catch (error) {
      logger.error(`Unable to lookup analysis reports ${error}`);
      return res.status(500).json({error: {message: 'Unable to lookup analysis reports.'}});
    }
  });

router.route('/:report')
  .get((req, res) => {
    const report = req.report.get();
    delete report.id;
    delete report.pog_id;
    delete report.createdBy_id;
    delete report.deletedAt;

    return res.json(req.report);
  })
  .put(async (req, res) => {
    const pastState = req.report.state;

    // Update Report
    if (req.body.state) {
      if (!['ready', 'active', 'presented', 'archived', 'nonproduction', 'reviewed', 'uploaded', 'signedoff'].includes(req.body.state)) {
        return res.status(400).json({error: {message: 'The provided report state is not valid'}});
      }
      req.report.state = req.body.state;
    }

    try {
      await req.report.save();
      logger.info('Report was saved');
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
      await db.models.pog_analysis_reports_history.create(dh);
      logger.info('Analysis report history was successfylly created');

      return res.json(req.report);
    } catch (error) {
      logger.error(error);
      return res.status(500).json({error: {message: 'Unable to update report.'}});
    }
  });

/**
 * Report User Binding
 */
router.route('/:report/user')
  .post(async (req, res) => {

    const access = new Acl(req, res);
    if (!access.check()) {
      logger.error(`User doesn't have correct permissions to add a user binding ${req.user.username}`);
      return res.status(403).json({error: {message: 'User doesn\'t have correct permissions to add a user binding'}});
    }

    if (!req.body.user) {
      return res.status(400).json({error: {message: 'No user provided for binding'}});
    }
    if (!req.body.role) {
      return res.status(400).json({error: {message: 'No role provided for binding'}});
    }

    const report = new Report(req.report);

    try {
      const result = await report.bindUser(req.body.user, req.body.role, req.user);
      logger.info(`Response from bind user ${result}`);
      return res.json(result);
    } catch (error) {
      logger.error(error);
      const code = (error.code === 'userNotFound') ? 404 : 400;
      return res.status(code).json(error);
    }
  })
  .delete(async (req, res) => {

    const access = new Acl(req, res);
    if (!access.check()) {
      logger.error(`User doesn't have correct permissions to remove a user binding ${req.user.username}`);
      return res.status(403).json({error: {message: 'User doesn\'t have correct permissions to remove a user binding'}});
    }

    if (!req.body.user) {
      return res.status(400).json({error: {message: 'No user provided for binding'}});
    }
    if (!req.body.role) {
      return res.status(400).json({error: {message: 'No role provided for binding'}});
    }

    const report = new Report(req.report);

    try {
      const result = await report.unbindUser(req.body.user, req.body.role);
      logger.info(`Response from unbind ${result}`);
      return res.json(result);
    } catch (error) {
      logger.error(error);
      const code = ['userNotFound', 'noBindingFound'].includes(error.code) ? 404 : 400;
      return res.status(code).json(error);
    }
  });

module.exports = router;
