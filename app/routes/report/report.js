const HTTP_STATUS = require('http-status-codes');
const express = require('express');
const {Op} = require('sequelize');

const tableFilter = require('../../libs/tableFilter');
const db = require('../../models');
const Acl = require('../../middleware/acl');
const Report = require('../../libs/structures/analysis_report');
const {loadImage} = require('./images');
const logger = require('../../log');

const reportMiddleware = require('../../middleware/analysis_report');
const validateAgainstSchema = require('../../libs/validateAgainstSchema');
const deleteModelEntries = require('../../libs/deleteModelEntries');
const {createReportSection, createReportGenes} = require('./db');

const router = express.Router({mergeParams: true});

const reportSchema = require('../../schemas/report/entireReport');

const DEFAULT_PAGE_LIMIT = 25;
const DEFAULT_PAGE_OFFSET = 0;


// Register middleware
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
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: error.message, code: error.code}});
    }
    let opts = {
      where: {},
      include: [
        {
          model: db.models.patientInformation,
          as: 'patientInformation',
          attributes: {exclude: ['id', 'deletedAt']},
        },
        {model: db.models.tumourAnalysis.scope('public'), as: 'tumourAnalysis'},
        {model: db.models.user.scope('public'), as: 'createdBy'},
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
     * patientID, analysisBiopsy, tumourType, physician, state, caseType, or alternateIdentifier */
    if (req.query.sort) {
      const modelMapping = (index, order) => {
        return {
          patientID: ['patientId', order],
          analysisBiopsy: ['biopsyName', order],
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
          alternateIdentifier: ['alternateIdentifier', order],
        }[index];
      };
      let {sort} = req.query;

      sort = sort.split(',');
      opts.order = sort.map((sortGroup) => { return modelMapping(...sortGroup.split(':')); });
    } else {
      opts.order = [
        ['state', 'desc'],
        ['patientId', 'desc'],
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
          {'$patientInformation.tumourType$': {[Op.iLike]: `%${req.query.searchText}%`}},
          {'$patientInformation.biopsySite$': {[Op.iLike]: `%${req.query.searchText}%`}},
          {'$patientInformation.physician$': {[Op.iLike]: `%${req.query.searchText}%`}},
          {'$patientInformation.caseType$': {[Op.iLike]: `%${req.query.searchText}%`}},
          {'$tumourAnalysis.diseaseExpressionComparator$': {[Op.iLike]: `%${req.query.searchText}%`}},
          {'$tumourAnalysis.ploidy$': {[Op.iLike]: `%${req.query.searchText}%`}},
          {patientId: {[Op.iLike]: `%${req.query.searchText}%`}},
        ],
      };
    }

    // Create mapping for available columns to filter on
    const columnMapping = {
      patientID: {column: 'patientId', table: null},
      analysisBiopsy: {column: 'biopsyName', table: null},
      tumourType: {column: 'tumourType', table: 'patientInformation'},
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
      logger.error(`Unable to lookup reports ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to lookup reports'}});
    }
  })
  .post(async (req, res) => {
    // verify user is allowed to upload a report
    const access = new Acl(req, res);
    if (!access.check()) {
      logger.error(`User: ${req.user.username} doesn't have correct permissions to upload a report`);
      return res.status(HTTP_STATUS.FORBIDDEN).json({error: {message: 'User doesn\'t have correct permissions to upload a report'}});
    }

    // validate loaded report against schema
    try {
      validateAgainstSchema(reportSchema, req.body);
    } catch (error) {
      logger.error(`Error while validating ${error}`);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message: 'There was an error validating', cause: error}});
    }

    // get project
    let project;
    try {
      project = await db.models.project.findOne({where: {name: req.body.project}});
    } catch (error) {
      logger.error(`Unable to find project ${req.body.project} with error ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to find project', cause: error}});
    }

    if (!project) {
      logger.error(`Project ${req.body.project} doesn't currently exist`);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message: `Project ${req.body.project} doesn't currently exist`}});
    }

    const createdComponents = {};
    const cleanUpReport = async (error) => {
      logger.error(`Unable to create report ${error}`);

      // delete already created report components
      try {
        await deleteModelEntries(createdComponents);
      } catch (err) {
        logger.error(`Unable to delete the already created components of the report ${err}`);
      }

      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to create report', cause: error}});
    };

    // create report
    let report;
    try {
      req.body.createdBy_id = req.user.id;

      report = await db.models.analysis_report.create(req.body);

      createdComponents.analysis_report = report.id;
    } catch (error) {
      return cleanUpReport(error);
    }

    // find or create report-project association
    try {
      const reportProjectData = {reportId: report.id, project_id: project.id};
      const [reportProject, createdReportProject] = await db.models.reportProject.findOrCreate({where: reportProjectData, defaults: reportProjectData});

      if (createdReportProject) {
        createdComponents.reportProject = reportProject.id;
      }
    } catch (error) {
      return cleanUpReport(error);
    }

    try {
      // create the genes first since they will need to be linked to the variant records
      const geneDefns = await createReportGenes(report, req.body);

      const promises = [];
      // for all associations create new entry based on the
      // included associations in req.body
      const {
        ReportUserFilter,
        createdBy,
        probe_signature,
        presentation_discussion,
        presentation_slides,
        users,
        analystComments,
        projects,
        genes,
        ...associations
      } = db.models.analysis_report.associations;

      Object.values(associations).forEach((association) => {
        const model = association.target.name;
        logger.debug(`creating report (${model}) section (${report.ident})`);
        if (req.body[model]) {
          promises.push(createReportSection(report.id, geneDefns, model, req.body[model]));
        }
      });
      await Promise.all(promises);
    } catch (error) {
      logger.error(`Unable to create all report components ${error}`);

      // delete already created report/report components
      try {
        await deleteModelEntries(createdComponents);
      } catch (err) {
        logger.error(`Unable to delete the already created report/components of the report ${err}`);
      }

      return res.status(400).json({error: {message: 'Unable to create all report components', cause: error}});
    }

    // add images to db
    try {
      await Promise.all(req.body.images.map(async ({path, key}) => {
        return loadImage(report.id, key, path);
      }));
    } catch (error) {
      logger.error(`Unable to load images ${error}`);
      return cleanUpReport(error);
    }

    return res.json({message: 'Report upload was successful', ident: report.ident});
  });

router.route('/:report')
  .get((req, res) => {
    const report = req.report.get();
    delete report.id;
    delete report.createdBy_id;
    delete report.deletedAt;

    return res.json(req.report);
  })
  .delete(async (req, res) => {
    // first check user permissions before delete
    const access = new Acl(req, res);
    if (!access.check()) {
      logger.error('User doesn\'t have correct permissions to delete report');
      return res.status(HTTP_STATUS.FORBIDDEN).json({error: {message: 'User doesn\'t have correct permissions to delete report'}});
    }

    try {
      await db.models.analysis_report.destroy({where: {id: req.report.id}, force: true});
      return res.status(HTTP_STATUS.NO_CONTENT).send();
    } catch (error) {
      logger.error(`Error trying to delete report ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Error trying to delete report', cause: error}});
    }
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
        id, createdBy_id, deletedAt, ...publicModel
      } = dataValues;

      publicModel.patientInformation = req.report.patientInformation;
      publicModel.users = req.report.users;

      return res.json(publicModel);
    } catch (error) {
      logger.error(`Unable to update report ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to update report', cause: error}});
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
      return res.status(HTTP_STATUS.FORBIDDEN).json(
        {error: {message: 'User doesn\'t have correct permissions to add a user binding'}},
      );
    }

    if (!req.body.user) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message: 'No user provided for binding'}});
    }
    if (!req.body.role) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message: 'No role provided for binding'}});
    }

    const report = new Report(req.report);

    try {
      const result = await report.bindUser(req.body.user, req.body.role, req.user);
      logger.info(`Response from bind user ${result}`);
      return res.json(result);
    } catch (error) {
      logger.error(error);
      const code = (error.code === 'userNotFound') ? HTTP_STATUS.NOT_FOUND : HTTP_STATUS.BAD_REQUEST;
      return res.status(code).json(error);
    }
  })
  .delete(async (req, res) => {
    const access = new Acl(req, res);
    if (!access.check()) {
      logger.error(
        `User doesn't have correct permissions to remove a user binding ${req.user.username}`,
      );
      return res.status(HTTP_STATUS.FORBIDDEN).json(
        {error: {message: 'User doesn\'t have correct permissions to remove a user binding'}},
      );
    }

    if (!req.body.user) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message: 'No user provided for binding'}});
    }
    if (!req.body.role) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message: 'No role provided for binding'}});
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

module.exports = router;
