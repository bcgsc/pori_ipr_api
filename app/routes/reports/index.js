const HTTP_STATUS = require('http-status-codes');
const express = require('express');
const Ajv = require('ajv');
const {Op} = require('sequelize');
const tableFilter = require('../../libs/tableFilter');
const db = require('../../models');
const Acl = require('../../middleware/acl');
const Report = require('../../libs/structures/analysis_report');
const {loadImage} = require('./images');
const logger = require('../../log');

const pogMiddleware = require('../../middleware/pog');
const reportMiddleware = require('../../middleware/analysis_report');
const ajvErrorFormatter = require('../../libs/ajvErrorFormatter');
const deleteModelEntries = require('../../libs/deleteModelEntries');

const router = express.Router({mergeParams: true});
const ajv = new Ajv({
  useDefaults: true, unknownFormats: ['int32', 'float'], coerceTypes: true, logger,
});

const reportSchema = require('../../schemas/report/entireReport');

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
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: error.message, code: error.code}});
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
      const modelMapping = (index, order) => {
        return {
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
        }[index];
      };
      let {sort} = req.query;

      sort = sort.split(',');
      opts.order = sort.map((sortGroup) => { return modelMapping(...sortGroup.split(':')); });
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
        return res.status(HTTP_STATUS.FORBIDDEN).json({
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
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to lookup analysis reports.'}});
    }
  })
  .post(async (req, res) => {
    // verify user is allowed to upload a report
    const access = new Acl(req, res);
    if (!access.check()) {
      logger.error(`User: ${req.user.username} doesn't have correct permissions to upload a report`);
      return res.status(403).json({error: {message: 'User doesn\'t have correct permissions to upload a report'}});
    }

    // validate loaded report against schema
    let valid;
    try {
      valid = await ajv.validate(reportSchema, req.body);
    } catch (error) {
      logger.error(`User while validating ${error}`);
      return res.status(400).json({error: {message: 'There was an error validating', cause: error}});
    }

    if (!valid) {
      ajvErrorFormatter(ajv.errors, logger);
      return res.status(400).json({error: {message: 'The provided report data is not valid', cause: ajv.errors}});
    }

    // get project
    let project;
    try {
      project = await db.models.project.findOne({where: {name: req.body.project}});
    } catch (error) {
      logger.error(`Unable to find project ${req.body.project} with error ${error}`);
      return res.status(500).json({error: {message: 'Unable to find project', cause: error}});
    }

    if (!project) {
      logger.error(`Project ${req.body.project} doesn't currently exist`);
      return res.status(400).json({error: {message: `Project ${req.body.project} doesn't currently exist`}});
    }

    const createdComponents = {};

    // find or create POG
    let patient;
    let createdPatient;
    try {
      [patient, createdPatient] = await db.models.POG.findOrCreate({where: {POGID: req.body.pog.POGID}, defaults: req.body.pog});

      if (createdPatient) {
        createdComponents.POG = patient.id;
      }
    } catch (error) {
      logger.error(`Unable to find or create patient ${req.body.pog.POGID} with this error ${error}`);

      // delete already created report components
      try {
        await deleteModelEntries(createdComponents);
      } catch (err) {
        logger.error(`Unable to delete the already created components of the report ${err}`);
      }

      return res.status(500).json({error: {message: 'Unable to find or create patient', cause: error}});
    }

    // find or create patient-project association
    try {
      const patientProject = {pog_id: patient.id, project_id: project.id};
      const [pogProject, createdPogProject] = await db.models.pog_project.findOrCreate({where: patientProject, defaults: patientProject});

      if (createdPogProject) {
        createdComponents.pog_project = pogProject.id;
      }
    } catch (error) {
      logger.error(`Unable to create an association between patient and project ${error}`);

      // delete already created report components
      try {
        await deleteModelEntries(createdComponents);
      } catch (err) {
        logger.error(`Unable to delete the already created components of the report ${err}`);
      }

      return res.status(500).json({error: {message: 'Unable to create an association between patient and project', cause: error}});
    }

    // find or create Analysis
    let patientAnalysis;
    let patientAnalysisCreated;
    try {
      req.body.analysis.pog_id = patient.id;

      [patientAnalysis, patientAnalysisCreated] = await db.models.pog_analysis.findOrCreate({where: {pog_id: patient.id, analysis_biopsy: req.body.analysis.analysis_biopsy}, defaults: req.body.analysis});

      if (patientAnalysisCreated) {
        createdComponents.pog_analysis = patientAnalysis.id;
      }
    } catch (error) {
      logger.error(`Unable to find or create patient analysis ${req.body.analysis.analysis_biopsy} with error ${error}`);

      // delete already created report components
      try {
        await deleteModelEntries(createdComponents);
      } catch (err) {
        logger.error(`Unable to delete the already created components of the report ${err}`);
      }

      return res.status(500).json({error: {message: 'Unable to find or create patient analysis', cause: error}});
    }

    // create report
    let report;
    try {
      req.body.analysis_id = patientAnalysis.id;
      req.body.pog_id = patient.id;
      req.body.createdBy_id = req.user.id;

      report = await db.models.analysis_report.create(req.body);

      createdComponents.analysis_report = report.id;
    } catch (error) {
      logger.error(`Unable to create report ${error}`);

      // delete already created report components
      try {
        await deleteModelEntries(createdComponents);
      } catch (err) {
        logger.error(`Unable to delete the already created components of the report ${err}`);
      }

      return res.status(500).json({error: {message: 'Unable to create report', cause: error}});
    }

    const {
      pog, analysis, ReportUserFilter, createdBy, probe_signature,
      presentation_discussion, presentation_slides, users,
      analystComments, ...associations
    } = db.models.analysis_report.associations;
    const promises = [];
    // for all associations create new entry based on the
    // included associations in req.body
    Object.values(associations).forEach((association) => {
      const model = association.target.name;

      if (req.body[model]) {
        if (Array.isArray(req.body[model])) {
          // update new model entries with pog and report id
          req.body[model].forEach((newEntry) => {
            newEntry.pog_id = patient.id;
            newEntry.reportId = report.id;
          });

          promises.push(db.models[model].bulkCreate(req.body[model]));
        } else {
          req.body[model].pog_id = patient.id;
          req.body[model].reportId = report.id;

          promises.push(db.models[model].create(req.body[model]));
        }
      }
    });

    try {
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

      // delete already created report/report components
      try {
        await deleteModelEntries(createdComponents);
      } catch (err) {
        logger.error(`Unable to delete the already created report/components of the report ${err}`);
      }

      return res.status(500).json({error: {message: 'Unable to load images', cause: error}});
    }

    return res.json({message: 'Report upload was successful', ident: report.ident});
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
  .delete(async (req, res) => {
    // first check user permissions before delete
    const access = new Acl(req, res);
    if (!access.check()) {
      logger.error('User doesn\'t have correct permissions to delete report');
      return res.status(HTTP_STATUS.FORBIDDEN).json({error: {message: 'User doesn\'t have correct permissions to delete report'}});
    }

    try {
      await req.report.destroy();
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
        id, pog_id, createdBy_id, deletedAt, ...publicModel
      } = dataValues;

      publicModel.patientInformation = req.report.patientInformation;
      publicModel.analysis = req.report.analysis;
      publicModel.pog = req.report.pog;
      publicModel.users = req.report.users;

      return res.json(publicModel);
    } catch (error) {
      logger.error(`Unable to update analysis report ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to update analysis report', cause: error}});
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
