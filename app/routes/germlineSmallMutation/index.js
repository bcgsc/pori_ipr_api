const HTTP_STATUS = require('http-status-codes');
const _ = require('lodash');
const {Op} = require('sequelize');
const express = require('express');


const db = require('../../models');

const Patient = require('../../libs/patient/patient.library');
const Analysis = require('../../modules/analysis/analysis.object');
const Variants = require('./util/germline_small_mutation_variant');
const Report = require('./util/germline_small_mutation');

const gsmMiddleware = require('../../middleware/germlineSmallMutation/germline_small_mutation.middleware');

const variantRouter = require('./variants');
const reviewRouter = require('./reviews');
const batchExportRouter = require('./export.batch');

const logger = require('../../log');

const router = express.Router({mergeParams: true});

const DEFAULT_PAGE_LIMIT = 25;
const DEFAULT_PAGE_OFFSET = 0;

// Register Middleware
router.param('gsm_report', gsmMiddleware);


/**
 * Load Germline Report
 *
 * /POG/{POGID}/analysis/{analysis}
 *
 * @param {object} req - Express request
 * @param {object} res - Express response
 *
 * @property {string} req.params.analysis - Bioapps biopsy/analysis value Eg: biop1
 * @property {string} req.params.patient - Patient identifier Eg: POG1234
 * @property {string} req.body.source - Source file path
 * @property {string} req.body.version - Source file version Eg: v0.0.1
 * @property {Array.<object>} req.body.rows - Data rows
 * @property {string} req.body.project - Project name
 * @property {string} req.body.normal_library - The germline/normal library name Eg: P12345
 * @property {object} req.user - Current user
 *
 * @returns {Promise.<object>} - Returns the created report
 */
router.post('/patient/:patient/biopsy/:analysis', async (req, res) => {
  // Check for required values
  const required = {};
  if (!req.params.analysis) {
    required.analysis = 'A bioapps biopsy/analysis value is required. Eg: biop1';
  }
  if (!req.body.source) {
    required.source = 'The source file path is required';
  }
  if (!req.body.version) {
    required.version = 'The source file version is required. Eg: v0.0.1';
  }
  if (!req.params.patient) {
    required.patient = 'The patient identifier is required. Eg: POG1234';
  }
  if (!req.body.rows) {
    required.rows = 'Data rows are required for import. Empty arrays are valid.';
  }
  if (!req.body.project) {
    required.project = 'Project name is required to load a report';
  }
  if (!req.body.normal_library) {
    required.normal_library = 'The germline/normal library name is requried, Eg: P12345';
  }

  if (Object.keys(required).length > 0) {
    logger.error('Required fields were missing');
    return res.status(HTTP_STATUS.BAD_REQUEST).json({message: 'Required fields were missing.', fields: required});
  }

  let patient;
  try {
    // Create or retrieve patient object
    patient = await Patient.retrieveOrCreate(req.params.patient, req.body.project);
  } catch (error) {
    logger.error(`There was an error while retrieving patient ${error}`);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({message: 'There was an error while retrieving patient'});
  }

  let analysis;
  try {
    // Create or Retrieve Biopsy Analysis
    analysis = await Analysis.retrieveOrCreate(patient.id, {libraries: {normal: req.body.normal_library}, analysis_biopsy: req.params.analysis});
  } catch (error) {
    logger.error(`There was an error retrieving/creating analysis ${error}`);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({message: 'There was an error retrieving/creating analysis'});
  }

  // Begin creating Report
  const reportOpt = {
    pog_analysis_id: analysis.id,
    source_version: req.body.version,
    source_path: req.body.source,
    biofx_assigned_id: req.user.id,
  };

  let report;
  try {
    // Create Small Mutation Report object
    report = await db.models.germline_small_mutation.create(reportOpt);
  } catch (error) {
    logger.error(`There was an error creating germline small mutation report ${error}`);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({message: 'There was an error creating germline small mutation report'});
  }

  try {
    // Prepare Rows with processing
    const processedVariants = await Variants.processVariants(report, req.body.rows);
    const rows = await db.models.germline_small_mutation_variant.bulkCreate(processedVariants);

    const output = _.omit(report.toJSON(),
      ['id', 'pog_analysis_id', 'biofx_assigned_id', 'deletedAt']);
    output.analysis = analysis.toJSON();
    output.analysis.pog = patient.toJSON();
    output.variants = rows;
    output.biofx_assigned = req.user;

    return res.json(output);
  } catch (error) {
    // Cleanup
    await db.models.germline_small_mutation.destroy({where: {pog_analysis_id: analysis.id}});
    if (_.find(error.errors, {type: 'unique violation'})) {
      logger.error(`A report for ${patient.POGID} with version ${req.body.version} already exists`);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({message: `A report for ${patient.POGID} with version ${req.body.version} already exists`});
    }

    logger.error(`There was an error while creating germline reports ${error}`);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({message: `Failed to import report: ${error.message}`, error});
  }
});

/**
 * Get All Germline Reports
 *
 * @param {object} req - Express request
 * @param {object} res - Express response
 *
 * @property {object} req.query - Contains query options
 * @property {string} req.query.search - Search option for POGID
 * @property {string} req.query.project - Search option for project
 * @property {number} req.query.limit - Query page limit
 * @property {number} req.query.offset - Query page offset
 * @property {Array.<string>} req.user.groups - Array of groups user belongs to
 *
 * @returns {Promise.<object>} - Returns the reports and number of reports
 */
router.get('/', async (req, res) => {
  const opts = {
    order: [['id', 'desc']],
    where: {},
  };

  if (req.query.search) {
    opts.where['$analysis.pog.POGID$'] = {[Op.iLike]: `%${req.query.search}%`};
  }
  if (req.query.project) {
    opts.where['$analysis.pog.projects.name$'] = req.query.project;
  }

  let gsmReports;
  try {
    gsmReports = await db.models.germline_small_mutation.scope('public').findAndCountAll(opts);
  } catch (error) {
    logger.error(`There was an error while finding all germline reports ${error}`);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({message: 'There was an error while finding all germline reports'});
  }

  let reports = gsmReports.rows;

  // If user is in projects group, filter for reports that have been reviewed by biofx
  if (_.find(req.user.groups, {name: 'Projects'})) {
    reports = _.filter(reports, (record) => {
      return _.filter(record.reviews, {type: 'biofx'}).length > 0;
    });

    gsmReports.count = reports.length;
  }

  // Need to take care of limits and offsets outside of query to support natural sorting
  const limit = parseInt(req.query.limit, 10) || DEFAULT_PAGE_LIMIT;
  const offset = parseInt(req.query.offset, 10) || DEFAULT_PAGE_OFFSET;

  // Reverse natural sort by POGID
  reports.sort((a, b) => {
    return b.analysis.pog.POGID.localeCompare(a.analysis.pog.POGID, undefined, {numeric: true, sensitivity: 'base'});
  });

  // apply limit and offset to results
  const start = offset;
  const finish = offset + limit;
  const rows = reports.slice(start, finish);

  return res.json({total: gsmReports.count, reports: rows});
});

/**
 * Get Germline reports for specific biopsy
 *
 * @param {object} req - Express request
 * @param {object} res - Express response
 *
 * @property {string} req.params.analysis - Analysis biopsy
 * @property {string} req.params.patient - POGID
 *
 * @returns {Promise.<object>} - Returns the germline analysis reports
 */
router.get('/patient/:patient/biopsy/:analysis', async (req, res) => {
  const opts = {
    order: [['createdAt', 'desc']],
    attributes: {
      exclude: ['deletedAt', 'id', 'pog_analysis_id', 'biofx_assigned_id'],
    },
    include: [
      {
        as: 'analysis',
        model: db.models.pog_analysis.scope('public'),
        where: {analysis_biopsy: req.params.analysis},
        include: [{model: db.models.POG, as: 'pog', where: {POGID: req.params.patient}}],
      },
      {as: 'biofx_assigned', model: db.models.user.scope('public')},
      {as: 'variants', model: db.models.germline_small_mutation_variant, separate: true},
      {
        as: 'reviews',
        model: db.models.germline_small_mutation_review,
        separate: true,
        include: [{model: db.models.user.scope('public'), as: 'reviewedBy'}],
      },
    ],
  };

  try {
    const reports = await db.models.germline_small_mutation.scope('public').findAll(opts);
    return res.json(reports);
  } catch (error) {
    logger.error(`There was an error while trying to find all germline reports ${error}`);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({message: 'There was an error while trying to find all germline reports'});
  }
});


router.use('/patient/:patient/biopsy/:analysis/report/:gsm_report/variant', variantRouter);


// Individual report resources
router.route('/patient/:patient/biopsy/:analysis/report/:gsm_report')

  /**
   * Get an existing report
   *
   * GET /patient/{patient}/biopsy/{analysis}/report/{report}
   *
   * @urlParam {string} patientID - Patient unique ID (POGID)
   * @urlParam {string} biopsy - Biopsy analysis id (biop1)
   * @urlParam {stirng} report - Report UUID
   *
   * @returns {object} - Returns the requested report
   */
  .get((req, res) => {
    return res.json(req.report);
  })

  /**
   * Update an existing report
   *
   * GET /patient/{patient}/biopsy/{analysis}/report/{report}
   *
   * @urlParam {string} patientID - Patient unique ID (POGID)
   * @urlParam {string} biopsy - Biopsy analysis id (biop1)
   * @urlParam {stirng} report - Report UUID
   *
   * @bodyParam {string} biofx_assigned - ident string of user to be assigned
   * @bodyParam {
   *
   * @returns {Promise.<object>} - Returns updated report
   */
  .put(async (req, res) => {
    let report;
    try {
      report = await Report.updateReport(req.report, req.body);
    } catch (error) {
      logger.error(`There was an error updating the germline report ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({message: 'There was an error updating the germline report'});
    }

    try {
      const [publicReport] = await Report.public(report.ident);
      return res.json(publicReport);
    } catch (error) {
      logger.error(`There was an error while updating the germline report ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({message: 'There was an error while updating the germline report'});
    }
  })

  /**
   * Remove an existing report
   *
   * DELETE /patient/{patient}/biopsy/{analysis}/report/{report}
   *
   * @urlParam {string} patientID - Patient unique ID (POGID)
   * @urlParam {string} biopsy - Biopsy analysis id (biop1)
   * @urlParam {stirng} report - Report UUID
   *
   * @param {object} req - Express request
   * @param {object} res - Express response
   *
   * @returns {object} - Returns response
   */
  .delete(async (req, res) => {
    try {
      await req.report.destroy();
      return res.status(HTTP_STATUS.NO_CONTENT).send();
    } catch (error) {
      logger.error(`Error while removing requested germline report ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({message: 'Error while removing requested germline report'});
    }
  });


router.use('/export/batch', batchExportRouter);

// Reviews
router.use('/patient/:patient/biopsy/:analysis/report/:gsm_report/review', reviewRouter);


module.exports = router;
