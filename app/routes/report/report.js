const HTTP_STATUS = require('http-status-codes');
const express = require('express');
const {Op} = require('sequelize');

const createReport = require('../../libs/createReport');
const tableFilter = require('../../libs/tableFilter');
const db = require('../../models');
const Acl = require('../../middleware/acl');
const Report = require('../../libs/structures/analysis_report');
const logger = require('../../log');

const reportMiddleware = require('../../middleware/analysis_report');

const router = express.Router({mergeParams: true});

const schemaGenerator = require('../../schemas/schemaGenerator');
const validateAgainstSchema = require('../../libs/validateAgainstSchema');
const {REPORT_UPDATE_BASE_URI} = require('../../constants');
const {BASE_EXCLUDE} = require('../../schemas/exclude');

// Generate schema's
const reportUploadSchema = require('../../schemas/report/reportUpload')(true);

const updateSchema = schemaGenerator(db.models.analysis_report, {
  baseUri: REPORT_UPDATE_BASE_URI,
  exclude: [...BASE_EXCLUDE, 'createdBy_id', 'templateId', 'config'],
  nothingRequired: true,
  properties: {
    template: {
      type: 'string',
      description: 'Template name',
    },
  },
});

const DEFAULT_PAGE_LIMIT = 25;
const DEFAULT_PAGE_OFFSET = 0;


// Register report middleware
router.param('report', reportMiddleware);

router.route('/:report')
  .get((req, res) => {
    return res.json(req.report.view('public'));
  })
  .put(async (req, res) => {
    const {report} = req;
    try {
      // validate against the model
      validateAgainstSchema(updateSchema, req.body, false);
    } catch (err) {
      const message = `There was an error updating the report ${err}`;
      logger.error(message);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message}});
    }

    // Check for switching template
    if (req.body.template) {
      let temp;
      // Try to find template
      try {
        temp = await db.models.template.findOne({where: {name: {[Op.iLike]: req.body.template}}});
      } catch (error) {
        const message = `Error while trying to find ${req.body.template} with error: ${error.message || error}`;
        logger.error(message);
        return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message}});
      }

      if (!temp) {
        const message = `Template ${req.body.template} doesn't currently exist`;
        logger.error(message);
        return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message}});
      }

      // Set new template id
      req.body.templateId = temp.id;
    }

    // Update db entry
    try {
      await report.update(req.body);
      await report.reload();
      return res.json(report.view('public'));
    } catch (error) {
      logger.error(`Unable to update the report ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to update the report'}});
    }
  })
  .delete(async (req, res) => {
    // first check user permissions before delete
    const access = new Acl(req);
    if (!access.check()) {
      logger.error('User doesn\'t have correct permissions to delete report');
      return res.status(HTTP_STATUS.FORBIDDEN).json({error: {message: 'User doesn\'t have correct permissions to delete report'}});
    }

    try {
      await req.report.destroy();
      return res.status(HTTP_STATUS.NO_CONTENT).send();
    } catch (error) {
      logger.error(`Error trying to delete report ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Error trying to delete report'}});
    }
  });

/**
 * Report User Binding
 */
router.route('/:report/user')
  .post(async (req, res) => {
    const access = new Acl(req);
    if (!access.check()) {
      logger.error(
        `User doesn't have correct permissions to add a user binding ${req.user.username}`,
      );
      return res.status(HTTP_STATUS.FORBIDDEN).json(
        {error: {message: 'User doesn\'t have correct permissions to add a user binding'}},
      );
    }

    if (!req.body.user) {
      logger.error('No user provided for binding');
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message: 'No user provided for binding'}});
    }
    if (!req.body.role) {
      logger.error('No role provided for binding');
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message: 'No role provided for binding'}});
    }

    const report = new Report(req.report);

    try {
      const result = await report.bindUser(req.body.user, req.body.role, req.user);
      logger.info(`Response from bind user ${result}`);
      return res.status(HTTP_STATUS.CREATED).json(result);
    } catch (error) {
      logger.error(error);
      const code = (error.code === 'userNotFound') ? HTTP_STATUS.NOT_FOUND : HTTP_STATUS.BAD_REQUEST;
      return res.status(code).json(error);
    }
  })
  .delete(async (req, res) => {
    const access = new Acl(req);
    if (!access.check()) {
      logger.error(
        `User doesn't have correct permissions to remove a user binding ${req.user.username}`,
      );
      return res.status(HTTP_STATUS.FORBIDDEN).json(
        {error: {message: 'User doesn\'t have correct permissions to remove a user binding'}},
      );
    }

    if (!req.body.user) {
      logger.error('No user provided to remove binding');
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message: 'No user provided to remove binding'}});
    }
    if (!req.body.role) {
      logger.error('No role provided for removal');
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message: 'No role provided for removal'}});
    }

    const report = new Report(req.report);

    try {
      const result = await report.unbindUser(req.body.user, req.body.role);
      logger.info(`Response from unbind ${result}`);
      return res.json(result);
    } catch (error) {
      logger.error(error);
      const code = ['userNotFound', 'noBindingFound'].includes(error.code) ? HTTP_STATUS.NOT_FOUND : HTTP_STATUS.BAD_REQUEST;
      return res.status(code).json(error);
    }
  });

// Act on all reports
router.route('/')
  .get(async (req, res) => {
    // Check user permission and filter by project
    const access = new Acl(req);
    let projectAccess = null;
    try {
      projectAccess = await access.getProjectAccess();
      logger.info('Successfully got project access');
    } catch (error) {
      logger.error(error);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: error.message}});
    }
    let opts = {
      where: {},
      include: [
        {
          model: db.models.patientInformation,
          as: 'patientInformation',
          attributes: {exclude: ['id', 'deletedAt']},
        },
        {model: db.models.user.scope('public'), as: 'createdBy'},
        {model: db.models.template.scope('public'), as: 'template'},
        {
          model: db.models.analysis_reports_user,
          as: 'users',
          separate: true,
          include: [
            {model: db.models.user.scope('public'), as: 'user'},
          ],
        },
        {model: db.models.project.scope('public'), as: 'projects'},
      ],
    };

    /* Sort fields
     * args expected to take the form: ?sort=column:direction,column:direction...
     * where direction = asc or desc and column is one of:
     * patientID, analysisBiopsy, diagnosis, physician, state, caseType, or alternateIdentifier */
    if (req.query.sort) {
      const modelMapping = (index, order) => {
        return {
          patientID: ['patientId', order],
          analysisBiopsy: ['biopsyName', order],
          diagnosis: [
            {model: db.models.patientInformation, as: 'patientInformation'},
            'diagnosis',
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
          alternateIdentifier: ['alternateIdentifier', order],
        }[index];
      };
      let {sort} = req.query;

      sort = sort.split(',');
      opts.order = sort.map((sortGroup) => {
        return modelMapping(...sortGroup.split(':'));
      });
    } else {
      opts.order = [
        ['state', 'desc'],
        ['patientId', 'desc'],
      ];
    }

    if (req.query.project) { // check access if filtering on project
      // Get the names of the projects the user has access to
      const projectAccessNames = projectAccess.map((project) => {
        return project.name;
      });
      if (projectAccessNames.includes(req.query.project)) {
        opts.where['$projects.name$'] = req.query.project;
      } else {
        return res.status(HTTP_STATUS.FORBIDDEN).json({
          error: {message: 'You do not have access to the selected project'},
        });
      }
    } else {
      // otherwise filter by accessible projects
      const projectAccessIdent = projectAccess.map((project) => {
        return project.ident;
      });
      opts.where['$projects.ident$'] = {[Op.in]: projectAccessIdent};
    }

    if (req.query.searchText) {
      opts.where = {
        [Op.or]: [
          {'$patientInformation.diagnosis$': {[Op.iLike]: `%${req.query.searchText}%`}},
          {'$patientInformation.biopsySite$': {[Op.iLike]: `%${req.query.searchText}%`}},
          {'$patientInformation.physician$': {[Op.iLike]: `%${req.query.searchText}%`}},
          {'$patientInformation.caseType$': {[Op.iLike]: `%${req.query.searchText}%`}},
          {patientId: {[Op.iLike]: `%${req.query.searchText}%`}},
          {alternateIdentifier: {[Op.iLike]: `%${req.query.searchText}%`}},
        ],
      };
    }

    // Create mapping for available columns to filter on
    const columnMapping = {
      patientID: {column: 'patientId', table: null},
      analysisBiopsy: {column: 'biopsyName', table: null},
      diagnosis: {column: 'diagnosis', table: 'patientInformation'},
      physician: {column: 'physician', table: 'patientInformation'},
      state: {column: 'state', table: null},
      caseType: {column: 'caseType', table: 'patientInformation'},
      alternateIdentifier: {column: 'alternateIdentifier', table: null},
    };

    // Add filters to query if available
    opts = tableFilter(req, opts, columnMapping);

    // States
    if (req.query.states) {
      const states = req.query.states.split(',');
      opts.where.state = {[Op.in]: states};
    }

    // Are we filtering on POGUser relationship?
    if (req.query.role) {
      const userFilter = {
        model: db.models.analysis_reports_user,
        as: 'ReportUserFilter',
        where: {},
      };
      userFilter.where.user_id = req.user.id;
      userFilter.where.role = req.query.role; // Role filtering
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
      logger.error(`Unable to lookup reports ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to lookup reports'}});
    }
  })
  .post(async (req, res) => {
    // verify user is allowed to upload a report
    const access = new Acl(req);
    access.write = ['*'];
    if (!access.check()) {
      logger.error(`User: ${req.user.username} doesn't have correct permissions to upload a report`);
      return res.status(HTTP_STATUS.FORBIDDEN).json({error: {message: 'User doesn\'t have correct permissions to upload a report'}});
    }

    // validate loaded report against schema
    try {
      validateAgainstSchema(reportUploadSchema, req.body);
    } catch (error) {
      const message = `There was an error validating the report content ${error}`;
      logger.error(message);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message}});
    }

    try {
      req.body.createdBy_id = req.user.id;
      const reportIdent = await createReport(req.body);

      return res.status(HTTP_STATUS.CREATED).json({message: 'Report upload was successful', ident: reportIdent});
    } catch (error) {
      logger.error(error.message || error);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message: error.message}});
    }
  });

module.exports = router;
