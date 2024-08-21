const HTTP_STATUS = require('http-status-codes');
const {Op, literal} = require('sequelize');
const express = require('express');

const schemaGenerator = require('../../schemas/schemaGenerator');
const validateAgainstSchema = require('../../libs/validateAgainstSchema');
const {hasAccessToNonProdReports,
  hasAccessToUnreviewedReports} = require('../../libs/helperFunctions');
const {GERMLINE_UPDATE_BASE_URI} = require('../../constants');
const {GERMLINE_EXCLUDE} = require('../../schemas/exclude');

const db = require('../../models');
const logger = require('../../log');
const cache = require('../../cache');

const {generateKey} = require('../../libs/cacheFunctions');

const Variants = require('./util/variants');
const gsmMiddleware = require('../../middleware/germlineSmallMutation/reports');

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

const updateSchema = schemaGenerator(db.models.germlineSmallMutation, {
  baseUri: GERMLINE_UPDATE_BASE_URI, exclude: [...GERMLINE_EXCLUDE, 'biofxAssignedId'], properties: reportProperties, nothingRequired: true,
});

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
      req.body.biofxAssignedId = req.user.id;
    }

    // Update db entry
    try {
      await req.report.update(req.body, {userId: req.user.id});
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
        limit, offset, patientId, biopsyName, project, exported, reviewType,
      },
    } = req;

    // Check if user belongs to the Projects group
    const inProjectsGroup = req.user.groups.some((group) => {
      return group.name.trim().toLowerCase() === 'projects';
    });

    // Generate cache key
    const key = generateKey('/germline', req.query, {inProjectsGroup});

    try {
      const cacheResults = await cache.get(key);
      if (cacheResults) {
        res.type('json');
        return res.send(cacheResults);
      }
    } catch (error) {
      logger.error(`Error while checking cache for germline reports ${error}`);
    }

    // Setup query options
    const opts = {
      where: {
        ...((patientId) ? {patientId: {[Op.iLike]: `%${patientId}%`}} : {}),
        ...((biopsyName) ? {biopsyName: {[Op.iLike]: `%${biopsyName}%`}} : {}),
        ...((typeof exported === 'boolean') ? {exported} : {}),
      },
      include: [],
      distinct: 'id',
      offset: parseInt(offset, 10) || DEFAULT_PAGE_OFFSET,
      limit: parseInt(limit, 10) || DEFAULT_PAGE_LIMIT,
    };

    if (!hasAccessToNonProdReports(req.user)) {
      opts.where = {
        ...opts.where,
        state: {[Op.is]: literal('distinct from \'nonproduction\'')},
      };
    }
    if (!hasAccessToUnreviewedReports(req.user)) {
      opts.where = {
        ...opts.where,
        state: ['reviewed', 'completed'],
      };
    }

    // See if filtering reports bassed on project
    if (project) {
      opts.include.push(
        {
          as: 'projects', model: db.models.project.scope('public'), where: {name: project}, through: {attributes: []},
        },
      );
    }

    // Check if filtering by review
    if (reviewType || inProjectsGroup) {
      opts.include.push(
        {
          as: 'reviews',
          model: db.models.germlineSmallMutationReview,
          where: (reviewType) ? {type: reviewType.split(',') || reviewType} : {type: 'biofx'},
          attributes: {exclude: ['id', 'germlineReportId', 'reviewerId', 'deletedAt', 'updatedBy']},
          include: [{model: db.models.user.scope('public'), as: 'reviewer'}],
        },
      );
    }

    try {
      const gsmReports = await db.models.germlineSmallMutation.scope('public').findAndCountAll(opts);
      const results = {total: gsmReports.count, reports: gsmReports.rows};

      if (key) {
        cache.set(key, JSON.stringify(results), 'EX', 14400);
      }

      return res.json(results);
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
    reportData.sourcePath = source;
    reportData.sourceVersion = version;

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

    // Create transaction
    const transaction = await db.transaction();

    // Create germline report
    let report;
    try {
      report = await db.models.germlineSmallMutation.create({
        ...reportData,
        biofxAssignedId: req.user.id,
      }, {transaction});
    } catch (error) {
      await transaction.rollback();
      const message = `Error while creating germline small mutation report ${error}`;
      logger.error(message);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message}});
    }

    // Create report-project association
    try {
      await db.models.germlineReportsToProjects.create({
        germlineReportId: report.id, projectId: project.id,
      }, {transaction});
    } catch (error) {
      await transaction.rollback();
      const message = `Error while creating germline report-project association ${error}`;
      logger.error(message);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(message);
    }

    // Upload variants
    try {
      // create the variants for this report
      const processedVariants = Variants.processVariants(report, variants);
      await db.models.germlineSmallMutationVariant.bulkCreate(processedVariants.map((variant) => {
        return {...variant, germlineReportId: report.id};
      }), {transaction});
    } catch (error) {
      await transaction.rollback();
      const message = `Error while creating germline variants for report ${error}`;
      logger.error(message);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message}});
    }

    // Get newly created germline report
    try {
      const result = await db.models.germlineSmallMutation.scope('public').findOne({
        where: {id: report.id},
        transaction,
      });

      await transaction.commit();
      return res.status(HTTP_STATUS.CREATED).json(result);
    } catch (error) {
      await transaction.rollback();
      const message = `Error while trying to retrieve newly created germline report ${error}`;
      logger.error(message);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message}});
    }
  });

module.exports = router;
