const Excel = require('exceljs');
const _ = require('lodash');
const db = require('../../../models');
const RoutingInterface = require('../../../routes/routingInterface');

const Patient = require('../../../libs/patient/patient.library');
const Analysis = require('../../../libs/patient/analysis.library');
const Variants = require('../germline_small_mutation_variant');
const Review = require('../germline_small_mutation_review');
const Report = require('../germline_small_mutation');

const gsmMiddleware = require('../middleware/germline_small_mutation.middleware');
const reviewMiddleware = require('../middleware/germline_small_mutation_review.middleware');
const variantMiddleware = require('../middleware/germline_small_mutation_variant.middleware');

const {logger} = process;

const DEFAULT_PAGE_LIMIT = 25;
const DEFAULT_PAGE_OFFSET = 0;

class GSMRouter extends RoutingInterface {
  /**
   * Create and bind routes for Germline Small Mutations Module
   *
   * @type {TrackingRouter}
   * @param {object} io - Socket.io connection
   */
  constructor(io) {
    super();
    this.io = io;

    // Register Middleware
    this.registerMiddleware('gsm_report', gsmMiddleware);
    this.registerMiddleware('review', reviewMiddleware);
    this.registerMiddleware('variant', variantMiddleware);

    // Load Report
    this.registerEndpoint('post', '/patient/:patient/biopsy/:analysis', this.loadReport);

    // All Reports
    this.registerEndpoint('get', '/', this.getReports); // All reports for all cases
    this.registerEndpoint('get', '/patient/:patient/biopsy/:analysis', this.getAnalysisReport); // All reports for a biopsy

    // Individual Reports
    this.reportResource();

    // Variants
    this.reportVariants();

    // Reviews
    this.registerEndpoint('put', '/patient/:patient/biopsy/:analysis/report/:gsm_report/review', this.addReview); // Add review to report
    this.registerEndpoint('delete', '/patient/:patient/biopsy/:analysis/report/:gsm_report/review/:review', this.removeReview); // Add review to report

    // Export
    this.registerEndpoint('get', '/export/batch/token', this.getExportFlashToken);
    this.registerEndpoint('get', '/export/batch', this.batchExport);
  }

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
  async loadReport(req, res) {
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
      return res.status(400).json({message: 'Required fields were missing.', fields: required});
    }

    let patient;
    try {
      // Create or retrieve patient object
      patient = await Patient.retrieveOrCreate(req.params.patient, req.body.project);
    } catch (error) {
      logger.error(`There was an error while retrieving patient ${error}`);
      return res.status(500).json({message: 'There was an error while retrieving patient'});
    }

    let analysis;
    try {
      // Create or Retrieve Biopsy Analysis
      analysis = await Analysis.retrieveOrCreate(patient.id, req.params.analysis, null, {libraries: {normal: req.body.normal_library}});
    } catch (error) {
      logger.error(`There was an error retrieving/creating analysis ${error}`);
      return res.status(500).json({message: 'There was an error retrieving/creating analysis'});
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
      return res.status(500).json({message: 'There was an error creating germline small mutation report'});
    }

    try {
      // Prepare Rows with processing
      const processedVariants = await Variants.processVariants(report, req.body.rows);
      const rows = await db.models.germline_small_mutation_variant.bulkCreate(processedVariants);

      const output = report.toJSON();
      output.analysis = analysis.toJSON();
      output.analysis.pog = patient.toJSON();
      output.variants = rows;
      output.biofx_assigned = req.user;

      delete output.id;
      delete output.pog_analysis_id;
      delete output.biofx_assigned_id;
      delete output.deletedAt;

      return res.json(output);
    } catch (error) {
      // Cleanup
      await db.models.germline_small_mutation.destroy({where: {pog_analysis_id: analysis.id}});
      if (_.find(error.errors, {type: 'unique violation'})) {
        logger.error(`A report for ${patient.POGID} with version ${req.body.version} already exists`);
        return res.status(400).json({message: `A report for ${patient.POGID} with version ${req.body.version} already exists`});
      }

      logger.error(`There was an error while creating germline reports ${error}`);
      return res.status(500).json({message: `Failed to import report: ${error.message}`, error});
    }
  }

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
  async getReports(req, res) {
    const opts = {
      order: [['id', 'desc']],
      where: {},
    };

    if (req.query.search) {
      opts.where['$analysis.pog.POGID$'] = {$ilike: `%${req.query.search}%`};
    }
    if (req.query.project) {
      opts.where['$analysis.pog.projects.name$'] = req.query.project;
    }

    let gsmReports;
    try {
      gsmReports = await db.models.germline_small_mutation.scope('public').findAndCountAll(opts);
    } catch (error) {
      logger.error(`There was an error while finding all germline reports ${error}`);
      return res.status(500).json({message: 'There was an error while finding all germline reports'});
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
  }

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
  async getAnalysisReport(req, res) {
    const opts = {
      order: [['createdAt', 'desc']],
      attributes: {
        exclude: ['deletedAt', 'id', 'pog_analysis_id', 'biofx_assigned_id']
      },
      include: [
        {as: 'analysis', model: db.models.pog_analysis.scope('public'),
          where: {analysis_biopsy: req.params.analysis},
          include: [{model: db.models.POG, as: 'pog', where: {POGID: req.params.patient}}],
        },
        {as: 'biofx_assigned', model: db.models.user.scope('public')},
        {as: 'variants', model: db.models.germline_small_mutation_variant, separate: true},
        {as: 'reviews', model: db.models.germline_small_mutation_review, separate: true,
          include: [{model: db.models.user.scope('public'), as: 'reviewedBy'}],
        },
      ],
    };

    try {
      const reports = await db.models.germline_small_mutation.scope('public').findAll(opts);
      return res.json(reports);
    } catch (error) {
      logger.error(`There was an error while trying to find all germline reports ${error}`);
      return res.status(500).json({message: 'There was an error while trying to find all germline reports'});
    }
  }

  /**
   * Add review event for germline report
   *
   * @param {object} req - Express request
   * @param {object} res - Express response
   *
   * @property {number} req.user.id - Current users id
   * @property {string} req.body.type - Type of request
   * @property {number} req.report.id - Germline report id
   *
   * @returns {Promise.<object>} - Returns new review for germline report
   */
  async addReview(req, res) {
    if (!req.body.type) {
      logger.error('A review type is required in the body');
      return res.status(400).json({message: 'A review type is required in the body'});
    }

    const opts = {
      where: {
        reviewedBy_id: req.user.id,
        type: req.body.type,
        germline_report_id: req.report.id,
      },
    };

    let review;
    try {
      // Make sure not already signed
      review = await db.models.germline_small_mutation_review.scope('public').findOne(opts);
    } catch (error) {
      logger.error(`There was an error while trying to find germline review ${error}`);
      return res.status(500).json({message: 'There was an error while trying to find germline review'});
    }

    if (review) {
      return res.status(400).json({message: `Report has already been reviewed by ${review.reviewedBy.firstName} ${review.reviewedBy.lastName} for ${req.body.type}`});
    }

    // Create new review
    const data = {
      germline_report_id: req.report.id,
      reviewedBy_id: req.user.id,
      type: req.body.type,
      comment: req.body.comment,
    };

    let createdReview;
    try {
      createdReview = await db.models.germline_small_mutation_review.create(data);
    } catch (error) {
      logger.error(`There was an error while creating germline review ${error}`);
      return res.status(500).json({message: 'There was an error while creating germline review'});
    }

    if (res.finished) {
      logger.error('Response finished can\'t review report');
      return res.status(500).json({message: 'Reponse finished can\'t review report'});
    }

    try {
      const newReview = await Review.public(createdReview.ident);
      return res.json(newReview);
    } catch (error) {
      logger.error(`There was an error while creating a review for this report ${error}`);
      return res.status(500).json({message: 'There was an error while creating a review for this report'});
    }
  }

  /**
   * Remove a review from a report
   *
   * @param {object} req - Express request
   * @param {object} res - Express response
   *
   * @property {object} req.review - Report review
   *
   * @returns {Promise.<object>} - Returns 204 status
   */
  async removeReview(req, res) {
    try {
      await req.review.destroy();
      return res.status(204).send();
    } catch (error) {
      logger.error(`There was an error while trying to remove the requested germline report ${error}`);
      return res.status(500).json({message: 'Error while trying to remove the requested germline report'});
    }
  }

  // Resource endpoints for Variants
  async reportVariants() {
    this.registerResource('/patient/:patient/biopsy/:analysis/report/:gsm_report/variant/:variant')
      /**
       * Get an existing variant
       *
       * GET /patient/{patient}/biopsy/{analysis}/report/{gsm_report}/variant/{variant}
       *
       * @urlParam {string} patientID - Patient unique ID (POGID)
       * @urlParam {string} biopsy - Biopsy analysis id (biop1)
       * @urlParam {stirng} report - Report UUID
       * @urlParam {string} variant - Variant id (ident)
       *
       * @param {object} req - Express request
       * @param {object} res - Express response
       *
       * @returns {object} - Returns requested variant
       */
      .get((req, res) => {
        return res.json(req.variant);
      })

      /**
       * Update an existing variant
       *
       * PUT /patient/{patient}/biopsy/{analysis}/report/{gsm_report}/variant/{variant}
       *
       * @urlParam {string} patientID - Patient unique ID (POGID)
       * @urlParam {string} biopsy - Biopsy analysis id (biop1)
       * @urlParam {stirng} report - Report UUID
       * @urlParam {string} variant - Variant id (ident)
       *
       * @param {object} req - Express request
       * @param {object} res - Express response
       *
       * @property {object} req.variant - Requested variant
       *
       * @returns {object} - Returns updated variant
       */
      .put(async (req, res) => {
        // Update Variant details
        req.variant.patient_history = req.body.patient_history;
        req.variant.family_history = req.body.family_history;
        req.variant.hidden = req.body.hidden;

        try {
          await req.variant.save();
          return res.json(req.variant);
        } catch (error) {
          logger.error(`Error while trying to update variant ${error}`);
          return res.status(500).json({message: 'Error while trying to update variant'});
        }
      });
  }

  // Individual report resources
  reportResource() {
    this.registerResource('/patient/:patient/biopsy/:analysis/report/:gsm_report')

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
          return res.status(500).json({message: 'There was an error updating the germline report'});
        }

        try {
          const [publicReport] = await Report.public(report.ident);
          return res.json(publicReport);
        } catch (error) {
          logger.error(`There was an error while updating the germline report ${error}`);
          return res.status(500).json({message: 'There was an error while updating the germline report'});
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
          return res.status(204).send();
        } catch (error) {
          logger.error(`Error while removing requested germline report ${error}`);
          return res.status(500).json({message: 'Error while removing requested germline report'});
        }
      });
  }

  /**
   * Generate Batch Export
   *
   * Get a batch export of all report variants that have not been exported yet
   *
   * GET /export/batch
   *
   * @urlParam optional {string} reviews - Comma separated list of reviews required for export
   *
   * @param {object} req - Express request
   * @param {object} res - Express response
   *
   * @property {string} req.query.reviews - Report reviews
   *
   * @returns {Promise.<object>} - Returns the finished response
   */
  async batchExport(req, res) {
    const opts = {
      where: {
        exported: false,
      },
    };

    if (!req.query.reviews) {
      req.query.reviews = '';
    }

    let smallMutations;
    try {
      // Build list of reports that have been reviewed by both projects and biofx
      smallMutations = await db.models.germline_small_mutation.scope('public').findAll(opts);
    } catch (error) {
      logger.error(`Error while finding germline small mutations ${error}`);
      return res.status(500).json({message: 'Error while finding germline small mutations'});
    }

    let variants = [];
    // Loop through reports, and ensure they have all required reviews
    smallMutations.forEach((value) => {
      // Ensure all required reviews are present on report
      if (_.intersection(req.query.reviews.split(','),
        _.map(value.reviews, (review) => { return review.type; })).length > req.query.reviews.split(',').length) {
        return;
      }

      const availableVariants = _.filter(value.variants, (variant) => {
        return !variant.hidden;
      });

      const parsedVariants = availableVariants.map((variant) => {
        return Object.assign({sample: `${value.analysis.pog.POGID}_${value.analysis.libraries.normal}`}, variant.toJSON());
      });
      variants = variants.concat(parsedVariants);
    });

    // Prepare export
    const workbook = new Excel.Workbook();

    workbook.creator = 'BC Genome Sciences Center - BC Cancer Agency - IPR';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Exports');

    sheet.columns = Variants.createHeaders();

    variants.forEach((variant) => {
      sheet.addRow(variant);
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${new Date()}.ipr.germline.export.xlsx`);

    try {
      await workbook.xlsx.write(res);
      return res.end();
    } catch (error) {
      logger.error(`Error while writing xlsx export of recent reports ${error}`);
      return res.status(500).json({message: 'Error while writing xlsx export of recent reports'});
    }
  }

  /**
   * Generate a flash token for exporting reports
   *
   * Get a batch export of all report variants that have not been exported yet
   *
   * GET /export/batch/token
   *
   * @param {object} req - Express request
   * @param {object} res - Express response
   *
   * @property {number} req.user.id - Current user's id
   *
   * @returns {Promise.<object>} - Returns the created flash token
   */
  async getExportFlashToken(req, res) {
    try {
      const flashToken = await db.models.flash_token.create({user_id: req.user.id, resource: 'gsm_export'});
      return res.json({token: flashToken.token});
    } catch (error) {
      logger.error(`Error while trying to create flash token ${error}`);
      return res.status(500).json({message: 'Error while trying to create flash token'});
    }
  }
}

module.exports = GSMRouter;
