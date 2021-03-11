const HTTP_STATUS = require('http-status-codes');
const express = require('express');
const {Op} = require('sequelize');

const createReport = require('../../libs/createReport');
const {parseReportSortQuery} = require('../../libs/queryOperations');
const db = require('../../models');
const Acl = require('../../middleware/acl');
const Report = require('../../libs/structures/analysis_report');
const logger = require('../../log');
const cache = require('../../cache');

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
    const {
      query: {
        paginated, limit, offset, sort, project, states, role, searchText,
      },
    } = req;

    // Get projects the user has access to
    const access = new Acl(req);
    let projects;
    try {
      const projectAccess = await access.getProjectAccess();
      // Get the names of the projects the user has access to
      projects = projectAccess.map((proj) => {
        return proj.name;
      });
    } catch (error) {
      const message = `Error while trying to get project access ${error.message || error}`;
      logger.error(message);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message}});
    }

    // Check if they want reports from a specific project
    // and that they have access to that project
    if (project) {
      if (projects.includes(project)) {
        projects = project;
      } else {
        return res.status(HTTP_STATUS.FORBIDDEN).json({
          error: {message: 'You do not have access to the selected project'},
        });
      }
    }

    // Generate cache key
    const key = Object.keys(req.query).length ? null : `/reports?projectAccess=${projects.sort().join(',')}`;

    try {
      const cacheResults = await cache.get(key);
      if (cacheResults) {
        res.type('json');
        return res.send(cacheResults);
      }
    } catch (error) {
      logger.error(`Error while checking cache for reports ${error}`);
    }

    // Generate options for report query
    const opts = {
      where: {
        ...((states) ? {state: states.split(',')} : {}),
        ...((searchText) ? {
          [Op.or]: [
            {'$patientInformation.diagnosis$': {[Op.iLike]: `%${searchText}%`}},
            {'$patientInformation.biopsySite$': {[Op.iLike]: `%${searchText}%`}},
            {'$patientInformation.physician$': {[Op.iLike]: `%${searchText}%`}},
            {'$patientInformation.caseType$': {[Op.iLike]: `%${searchText}%`}},
            {patientId: {[Op.iLike]: `%${searchText}%`}},
            {alternateIdentifier: {[Op.iLike]: `%${searchText}%`}},
          ],
        } : {}),
      },
      distinct: 'id',
      // **searchText with paginated with patientInformation set to required: true
      // should work and does for the most part, no errors, console logged query is correct
      // (I tested the generated SQL on the db and it worked fine), the returned
      // count is correct, but Sequelize never returns any rows.
      // Paginated can be added to searchText once this Sequelize bug is fixed.
      // Sequelize version is 6.5.0**
      ...((paginated && !searchText) ? {
        offset: parseInt(offset, 10) || DEFAULT_PAGE_OFFSET,
        limit: parseInt(limit, 10) || DEFAULT_PAGE_LIMIT,
      } : {}),
      order: (sort) ? parseReportSortQuery(sort) : [
        ['state', 'desc'],
        ['patientId', 'desc'],
      ],
      include: [
        {
          model: db.models.patientInformation,
          as: 'patientInformation',
          attributes: {exclude: ['id', 'reportId', 'deletedAt']},
        },
        {model: db.models.user.scope('public'), as: 'createdBy'},
        {
          model: db.models.template.scope('minimal'),
          as: 'template',
          required: true,
        },
        {
          model: db.models.analysis_reports_user,
          as: 'users',
          attributes: ['ident', 'role', 'createdAt', 'updatedAt'],
          include: [
            {model: db.models.user.scope('public'), as: 'user'},
          ],
        },
        {
          model: db.models.project,
          as: 'projects',
          where: {
            name: projects,
          },
          attributes: {exclude: ['id', 'deletedAt']},
          through: {attributes: []},
        },
        ...((role) ? [{
          model: db.models.analysis_reports_user,
          as: 'ReportUserFilter',
          where: {
            user_id: req.user.id,
            role,
          },
        }] : []),
      ],
    };

    try {
      const reports = await db.models.analysis_report.scope('public').findAndCountAll(opts);
      const results = {total: reports.count, reports: reports.rows};

      if (key) {
        cache.set(key, JSON.stringify(results), 'EX', 3600);
      }

      return res.json(results);
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
