const HTTP_STATUS = require('http-status-codes');
const {Op} = require('sequelize');
const express = require('express');

const schemaGenerator = require('../../schemas/schemaGenerator');
const validateAgainstSchema = require('../../libs/validateAgainstSchema');
const {GERMLINE_UPDATE_BASE_URI} = require('../../constants');
const {GERMLINE_EXCLUDE} = require('../../schemas/exclude');

const db = require('../../models');
const logger = require('../../log');

const Variants = require('./util/germline_small_mutation_variant');
const gsmMiddleware = require('../../middleware/germlineSmallMutation/germline_small_mutation.middleware');
const batchExportRouter = require('./export.batch');

const router = express.Router({mergeParams: true});

const DEFAULT_PAGE_LIMIT = 25;
const DEFAULT_PAGE_OFFSET = 0;


// Set additional update properties
const reportProperties = {
  assignToMe: {
    type: 'boolean',
  },
};

// Germline schema's
const germlineReportUploadSchema = require('../../schemas/germlineSmallMutation/upload')();

const updateSchema = schemaGenerator(db.models.germline_small_mutation, {
  baseUri: GERMLINE_UPDATE_BASE_URI, exclude: [...GERMLINE_EXCLUDE, 'biofx_assigned_id'], properties: reportProperties, nothingRequired: true,
});

router.use('/export/batch', batchExportRouter);

// Middleware for germline report
router.param('gsm_report', gsmMiddleware);


// Handles requests for a single germline report
router.route('/:gsm_report')
  .get((req, res) => {
    return res.json(req.report.view('public'));
  })
  .put(async (req, res) => {
    try {
      // validate against the model
      validateAgainstSchema(updateSchema, req.body, false);
    } catch (error) {
      const message = `There was an error validating the germline report update request ${error}`;
      logger.error(message);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message}});
    }

    // check if biofx assigned is being updated
    if (req.body.assignToMe) {
      req.body.biofx_assigned_id = req.user.id;
    }

    // Update db entry
    try {
      await req.report.update(req.body);
      await req.report.reload();
      return res.json(req.report.view('public'));
    } catch (error) {
      logger.error(`There was an error updating the germline report ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'There was an error updating the germline report'}});
    }
  })
  .delete(async (req, res) => {
    // Soft delete germline report
    try {
      await req.report.destroy();
      return res.status(HTTP_STATUS.NO_CONTENT).send();
    } catch (error) {
      logger.error(`Error while removing requested germline report ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Error while removing requested germline report'}});
    }
  });


// Handles requests for all germline reports
router.route('/')
  .get(async (req, res) => {
    const {
      query: {
        limit, offset, patientId, biopsyName, project,
      },
    } = req;

    // Check if user belongs to the Projects group
    const inProjectsGroup = req.user.groups.some((group) => {
      return group.name.trim().toLowerCase() === 'projects';
    });

    // Setup query options
    const opts = {
      where: {
        ...((patientId) ? {patientId: {[Op.iLike]: `%${patientId}%`}} : {}),
        ...((biopsyName) ? {biopsyName: {[Op.iLike]: `%${biopsyName}%`}} : {}),
      },
      offset: parseInt(offset, 10) || DEFAULT_PAGE_OFFSET,
      limit: parseInt(limit, 10) || DEFAULT_PAGE_LIMIT,
    };

    // See if filtering reports bassed on projects or type of review
    if (project || inProjectsGroup) {
      opts.include = [];
      if (project) {
        opts.include.push(
          {
            as: 'projects', model: db.models.project.scope('public'), where: {name: project}, through: {attributes: []},
          },
        );
      }
      if (inProjectsGroup) {
        opts.include.push(
          {
            as: 'reviews',
            model: db.models.germline_small_mutation_review,
            where: {type: 'biofx'},
            attributes: {exclude: ['id', 'germline_report_id', 'reviewedBy_id', 'deletedAt']},
            include: [{model: db.models.user.scope('public'), as: 'reviewedBy'}],
          },
        );
      }
    }

    try {
      const gsmReports = await db.models.germline_small_mutation.scope('public').findAndCountAll(opts);
      return res.json({total: gsmReports.count, reports: gsmReports.rows});
    } catch (error) {
      logger.error(`There was an error while finding all germline reports ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'There was an error while finding all germline reports'}});
    }
  })
  .post(async (req, res) => {
    try {
      // Validate against the model
      validateAgainstSchema(germlineReportUploadSchema, req.body);
    } catch (error) {
      const message = `There was an error validating the germline report upload request ${error}`;
      logger.error(message);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message}});
    }

    // Extract sections of germline report
    const {
      project: projectName, rows: variants, source, version, ...reportData
    } = req.body;

    // Fix for path names that do not match model names
    reportData.source_path = source;
    reportData.source_version = version;

    // Get project
    let project;
    try {
      project = await db.models.project.findOne({
        where: {name: {[Op.iLike]: projectName.trim()}},
      });
    } catch (error) {
      logger.error(`Unable to find project ${projectName} with error ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: `Unable to find project ${projectName}`}});
    }

    if (!project) {
      logger.error(`Project ${projectName} doesn't currently exist`);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message: `Project ${projectName} doesn't currently exist`}});
    }

    // Create germline report
    let report;
    try {
      report = await db.models.germline_small_mutation.create({
        ...reportData,
        biofx_assigned_id: req.user.id,
      });
    } catch (error) {
      const message = `Error while creating germline small mutation report ${error}`;
      logger.error(message);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message}});
    }

    // Create report-project association
    try {
      await db.models.germlineReportsToProjects.create({
        germlineReportId: report.id, projectId: project.id,
      });
    } catch (error) {
      const message = `Error while creating germline report-project association ${error}`;
      logger.error(message);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(message);
    }

    // Upload variants
    try {
      // create the variants for this report
      const processedVariants = Variants.processVariants(report, variants);
      await db.models.germline_small_mutation_variant.bulkCreate(
        processedVariants.map((variant) => {
          return {...variant, germline_report_id: report.id};
        })
      );
    } catch (error) {
      db.models.germline_small_mutation.destroy({where: {id: report.id}, force: true});
      const message = `Error while creating germline variants for report ${error}`;
      logger.error(message);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message}});
    }

    // Get newly created germline report
    try {
      const result = await db.models.germline_small_mutation.scope('public').findOne({
        where: {id: report.id},
      });
      return res.status(HTTP_STATUS.CREATED).json(result);
    } catch (error) {
      const message = `Error while trying to retrieve newly created germline report ${error}`;
      logger.error(message);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message}});
    }
  });


module.exports = router;
