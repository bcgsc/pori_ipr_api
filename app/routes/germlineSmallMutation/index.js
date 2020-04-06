const HTTP_STATUS = require('http-status-codes');
const _ = require('lodash');
const {Op} = require('sequelize');
const express = require('express');

const validateAgainstSchema = require('../../libs/validateAgainstSchema');
const db = require('../../models');

const Variants = require('./util/germline_small_mutation_variant');
const Report = require('./util/germline_small_mutation');

const germlineReportUploadSchema = require('../../schemas/germlineSmallMutation/upload');
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
 * /
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
 * @property {string} req.patientId - Patient id
 * @property {object} req.biopsyName - Biopsy name
 *
 * @returns {Promise.<object>} - Returns the created report
 */
router.post('/', async (req, res) => {
  const {params: user} = req;

  const content = {...req.body};

  try {
    // fix for path names that do not current match model names
    content.source_path = content.source;
    content.source_version = content.version;
    delete content.source;
    delete content.version;
    // validate against the model
    validateAgainstSchema(germlineReportUploadSchema, content);
  } catch (err) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json(err);
  }

  let report;
  let rawVariants;
  try {
    const {rows: variants, ...rest} = content;
    rawVariants = variants;

    ({dataValues: report} = await db.models.germline_small_mutation.create(
      {...rest, biofx_assigned: user.id},
    ));
  } catch (err) {
    logger.error(`There was an error creating germline small mutation report ${err}`);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(err);
  }

  try {
    // create the variants for this report
    const processedVariants = Variants.processVariants(report, rawVariants);
    const rows = await db.models.germline_small_mutation_variant.bulkCreate(processedVariants.map((v) => {
      return {...v, germline_report_id: report.id};
    }));

    const output = {
      ..._.omit(report, ['id', 'biofx_assigned_id', 'deletedAt']),
      variants: rows,
      biofx_assigned: user,
    };

    return res.status(HTTP_STATUS.CREATED).json(output);
  } catch (err) {
    db.models.germline_small_mutation.destroy({where: {id: report.id}, force: true});
    logger.error(`There was an error creating germline small mutation report variants ${err}`);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(err);
  }
});

/**
 * Get All Germline Reports
 *
 * @param {object} req - Express request
 * @param {object} res - Express response
 *
 * @property {object} req.query - Contains query options
 * @property {string} req.query.project - Search option for project
 * @property {string} req.query.patientId - Search option for Patient id
 * @property {string} req.query.biopsyName - Search option for Biopsy name
 * @property {number} req.query.limit - Query page limit
 * @property {number} req.query.offset - Query page offset
 * @property {Array.<string>} req.user.groups - Array of groups user belongs to
 *
 * @returns {Promise.<object>} - Returns the reports and number of reports
 */
router.get('/', async (req, res) => {
  const {
    query: {
      limit, offset, patientId, biopsyName, project,
    },
  } = req;

  const opts = {
    order: [['id', 'desc']],
    where: {},
  };

  if (patientId) {
    opts.where.patientId = {[Op.iLike]: `%${req.query.patientId}%`};
  }

  if (biopsyName) {
    opts.where.biopsyName = {[Op.iLike]: `%${req.query.biopsyName}%`};
  }

  if (project) {
    opts.where['$projects.name$'] = project;
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

  // Reverse natural sort by POGID
  reports.sort((a, b) => {
    return b.patientId.localeCompare(a.patientId, undefined, {numeric: true, sensitivity: 'base'});
  });

  // apply limit and offset to results
  const start = parseInt(offset, 10) || DEFAULT_PAGE_OFFSET;
  const finish = start + (parseInt(limit, 10) || DEFAULT_PAGE_LIMIT);
  const rows = reports.slice(start, finish);

  return res.json({total: gsmReports.count, reports: rows});
});

router.use('/:gsm_report/variant', variantRouter);


// Individual report resources
router.route('/:gsm_report')

  /**
   * Get an existing report
   *
   * GET /{report}
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
   * GET /{report}
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
   * DELETE /{report}
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
router.use('/:gsm_report/review', reviewRouter);


module.exports = router;
