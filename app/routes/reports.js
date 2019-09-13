const express = require('express');
const {Op} = require('sequelize');
const tableFilter = require('../libs/tableFilter');
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
    let opts = {
      where: {},
      include: [
        {
          model: db.models.patientInformation,
          as: 'patientInformation',
          attributes: {exclude: ['id', 'deletedAt', 'pog_id']},
        },
        {model: db.models.tumourAnalysis.scope('public'), as: 'tumourAnalysis'},
        {model: db.models.user.scope('public'), as: 'createdBy'},
        {
          model: db.models.POG.scope('public'),
          as: 'pog',
          include: [
            {
              model: db.models.project,
              as: 'projects',
              attributes: {exclude: ['id', 'createdAt', 'updatedAt', 'deletedAt']},
            },
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
      ],
    };

    /* Sort fields
     * args expected to take the form: ?sort=column:direction,column:direction...
     * where direction = asc or desc and column is one of:
     * patientID, analysisBiopsy, tumourType, physician, state, caseType, or alternateIdentifier */
    if (req.query.sort) {
      const modelMapping = (index, order) => ({
        patientID: [{model: db.models.POG, as: 'pog'}, 'POGID', order],
        analysisBiopsy: [{model: db.models.pog_analysis, as: 'analysis'}, 'analysis_biopsy', order],
        tumourType: [
          {model: db.models.patientInformation, as: 'patientInformation'},
          'tumour_type',
          order,
        ],
        physician: [
          {model: db.models.patientInformation, as: 'patientInformation'},
          'physician',
          order,
        ],
        state: ['state', order],
        caseType: [
          {model: db.models.patientInformation, as: 'patientInformation'},
          'caseType',
          order,
        ],
        alternateIdentifier: [
          {model: db.models.pog_analysis, as: 'analysis'},
          'pog.alternate_identifier',
          order,
        ],
      }[index]);
      let {sort} = req.query;

      sort = sort.split(',');
      opts.order = sort.map(sortGroup => modelMapping(...sortGroup.split(':')));
    } else {
      opts.order = [
        ['state', 'desc'],
        [{model: db.models.POG, as: 'pog'}, 'POGID', 'desc'],
      ];
    }

    // Check for types
    if (req.query.type === 'probe') {
      opts.where.type = 'probe';
    } else if (req.query.type === 'genomic') {
      opts.where.type = 'genomic';
    }

    if (req.query.project) { // check access if filtering on project
      // Get the names of the projects the user has access to
      const projectAccessNames = projectAccess.map((project) => {
        return project.name;
      });
      if (projectAccessNames.includes(req.query.project)) {
        opts.where['$pog.projects.name$'] = req.query.project;
      } else {
        return res.status(403).json({
          error: {message: 'You do not have access to the selected project'},
        });
      }
    } else {
      // otherwise filter by accessible projects
      const projectAccessIdent = projectAccess.map((project) => {
        return project.ident;
      });
      opts.where['$pog.projects.ident$'] = {[Op.in]: projectAccessIdent};
    }

    if (req.query.searchText) {
      opts.where = {
        [Op.or]: [
          {'$patientInformation.tumourType$': {[Op.iLike]: `%${req.query.searchText}%`}},
          {'$patientInformation.biopsySite$': {[Op.iLike]: `%${req.query.searchText}%`}},
          {'$patientInformation.physician$': {[Op.iLike]: `%${req.query.searchText}%`}},
          {'$patientInformation.caseType$': {[Op.iLike]: `%${req.query.searchText}%`}},
          {'$tumourAnalysis.diseaseExpressionComparator$': {[Op.iLike]: `%${req.query.searchText}%`}},
          {'$tumourAnalysis.ploidy$': {[Op.iLike]: `%${req.query.searchText}%`}},
          {'$pog.POGID$': {[Op.iLike]: `%${req.query.searchText}%`}},
        ],
      };
    }

    // Create mapping for available columns to filter on
    const columnMapping = {
      patientID: {column: 'POGID', table: 'pog'},
      analysisBiopsy: {column: 'analysis_biopsy', table: 'analysis'},
      tumourType: {column: 'tumourType', table: 'patientInformation'},
      physician: {column: 'physician', table: 'patientInformation'},
      state: {column: 'state', table: null},
      caseType: {column: 'caseType', table: 'patientInformation'},
      alternateIdentifier: {column: 'alternate_identifier', table: 'analysis'},
    };

    // Add filters to query if available
    opts = tableFilter(req, opts, columnMapping);

    // States
    if (req.query.states) {
      const states = req.query.states.split(',');
      opts.where.state = {[Op.in]: states};
    } else {
      opts.where.state = {[Op.not]: ['archived', 'nonproduction', 'reviewed']};
    }

    // Are we filtering on POGUser relationship?
    if (req.query.all !== 'true' || req.query.role) {
      const userFilter = {
        model: db.models.analysis_reports_user,
        as: 'ReportUserFilter',
        where: {},
      };
      userFilter.where.user_id = req.user.id;
      if (req.query.role) {
        userFilter.where.role = req.query.role; // Role filtering
      }
      opts.include.push(userFilter);
    }

    try {
      // return all reports
      let reports = await db.models.analysis_report.scope('public').findAll(opts);
      const total = reports.length;
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
      return res.json({total, reports});
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
    try {
      const result = await db.models.analysis_report.update(req.body, {
        where: {
          ident: req.report.ident,
        },
        individualHooks: true,
        paranoid: true,
        returning: true,
      });

      // Get updated model data from update
      const [, [{dataValues}]] = result;

      // Remove id's and deletedAt properties from returned model
      const {
        id, pog_id, createdBy_id, deletedAt, ...publicModel
      } = dataValues;

      publicModel.patientInformation = req.report.patientInformation;
      publicModel.analysis = req.report.analysis;
      publicModel.pog = req.report.pog;
      publicModel.users = req.report.users;

      return res.json(publicModel);
    } catch (error) {
      logger.error(`Unable to update analysis report ${error}`);
      return res.status(500).json({error: {message: 'Unable to update analysis report', cause: error}});
    }
  });

/**
 * Report User Binding
 */
router.route('/:report/user')
  .post(async (req, res) => {

    const access = new Acl(req, res);
    if (!access.check()) {
      logger.error(
        `User doesn't have correct permissions to add a user binding ${req.user.username}`,
      );
      return res.status(403).json(
        {error: {message: 'User doesn\'t have correct permissions to add a user binding'}},
      );
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
      logger.error(
        `User doesn't have correct permissions to remove a user binding ${req.user.username}`,
      );
      return res.status(403).json(
        {error: {message: 'User doesn\'t have correct permissions to remove a user binding'}},
      );
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
