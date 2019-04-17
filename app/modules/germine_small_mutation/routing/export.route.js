const Excel = require('exceljs');
const moment = require('moment');
const _ = require('lodash');
const db = require('../../../models');
const RoutingInterface = require('../../../routes/routingInterface');
const Variants = require('../germline_small_mutation_variant');

const {logger} = process;

/**
 * Flash Token Authentication and user injection
 *
 * @param {object} req - Express request
 * @param {object} res - Express response
 * @param {function} next - Callback function
 *
 * @returns {Promise.<number>} - Returns number of destroyed rows by deleting flash token from db
 */
const tokenAuth = async (req, res, next) => {
  // Check for authentication token
  if (!req.query.flash_token) {
    return res.status(403).json({message: 'A flash token is required in the url parameter: flash_token'});
  }

  try {
    const flashToken = await db.models.flash_token.findOne({
      where: {token: req.query.flash_token},
      include: [{model: db.models.user, as: 'user'}],
    });

    if (!flashToken) {
      logger.error('A valid flash token is required to download reports');
      return res.status(403).json({message: 'A valid flash token is required to download reports'});
    }

    req.user = flashToken.user;
    req.flash_token = flashToken;

    next();

    return flashToken.destroy();
  } catch (error) {
    logger.error(error);
    return res.status(500).json({error: {message: 'Failed to query for flash token provided'}});
  }
};

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
 * @returns {Promise.<object>} - Returns response object
 */
const batchExport = async (req, res) => {
  if (!req.flash_token) {
    logger.error('Missing flash token');
    return res.status(403).send();
  }

  // Where clauses
  const opts = {
    where: {
      exported: false,
    },
    include: [
      {model: db.models.pog_analysis, as: 'analysis', include: [{as: 'pog', model: db.models.POG.scope('public')}]},
      {model: db.models.germline_small_mutation_variant, as: 'variants', separate: true, order: [['gene', 'asc']]},
      {model: db.models.germline_small_mutation_review, as: 'reviews', separate: true, include: [{model: db.models.user.scope('public'), as: 'reviewedBy'}]},
    ],
  };

  let reports;
  let landscapes;

  if (!req.query.reviews) {
    req.query.reviews = '';
  }

  try {
    // Build list of reports that have been reviewed by both projects and biofx
    reports = await db.models.germline_small_mutation.findAll(opts);
  } catch (error) {
    logger.error(`Error while finding germline small mutation ${error}`);
    return res.status(500).json({error: {message: 'Error while finding germline small mutation'}});
  }

  const opts2 = {
    order: [['updatedAt', 'DESC']], // Gets us the most recent report worked on.
    include: [
      {model: db.models.analysis_report, as: 'report'},
    ],
    where: {
      '$report.analysis_id$': {
        $in: reports.map((report) => { return report.analysis.id; }),
      },
      '$report.state$': {
        $in: ['presented', 'active', 'archived'],
      },
    },
  };

  try {
    landscapes = await db.models.tumourAnalysis.findAll(opts2);
  } catch (error) {
    logger.error(`Error while trying to get tumour analysis ${error}`);
    return res.status(500).json({error: {message: 'Error while trying to get tumour analysis'}});
  }

  let variants = [];

  // Loop through reports, and ensure they have all required reviews
  reports.forEach((report) => {
    // Ensure all required reviews are present on report
    if (_.intersection(req.query.reviews.split(','),
      report.reviews.map((review) => { return review.type; })).length !== req.query.reviews.split(',').length) {
      return;
    }


    // Add samples name for each variant
    const parsedVariants = report.variants.map((variant) => {

      // Find mutation landscape
      const matchingLandscape = landscapes.find((landscape) => {
        return landscape.report.analysis_id === report.pog_analysis_id;
      });

      // Parse Mutation Landscape JSON array. Show modifier if there is one. Show associations if set. If sig has no associations, show number.
      const parseMl = (arr) => {
        return arr.map((ls) => { return `${ls.modifier} ${(ls.associations !== '-') ? ls.associations : `Signature ${ls.signature}`}`; }).join('; ');
      };

      const ml = (matchingLandscape) ? parseMl(matchingLandscape.mutationSignature) : 'N/A';

      // Watch for hidden rows
      if (!variant.hidden) {
        return Object.assign({sample: `${report.analysis.pog.POGID}_${report.analysis.libraries.normal}`, biopsy: report.analysis.analysis_biopsy, mutation_landscape: ml}, variant.toJSON());
      }
    });

    variants = variants.concat(parsedVariants);
  });

  // Removes skipped rows
  variants = variants.filter((variant) => { return (variant); });

  // Prepare export
  const workbook = new Excel.Workbook();

  workbook.subject = `Germline Small Mutation Reports Batch Export - ${moment().format('YYYY-MM-DD')}`;
  workbook.creator = `Integrated Pipeline Reports - C/O ${req.user.firstName} ${req.user.lastName}`;
  workbook.company = 'BC Cancer Agency - Michael Smith Genome Sciences Center';
  workbook.comment = 'For research purposes only';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Exports');

  sheet.columns = Variants.createHeaders();

  variants.forEach((variant) => {
    sheet.addRow(variant);
  });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=${moment().format('YYYY-MM-DD')}.ipr.germline.export.xlsx`);

  try {
    await workbook.xlsx.write(res);
  } catch (error) {
    logger.error(`There was an error while creating xlsx export ${error}`);
    return res.status(500).json({message: 'There was an error while creating xlsx export'});
  }

  try {
    reports = reports.filter((report) => {
      // Check if report was exported
      return !(_.intersection(req.query.reviews.split(','), 
        report.reviews.map((review) => { return review.type; })).length !== req.query.reviews.split(',').length);
    });
    // Mark all exported reports in DB
    await Promise.all(reports.map(async (report) => {
      report.exported = true;
      return report.save();
    }));
    return res.end();
  } catch (error) {
    logger.error(`There was an error while saving updated reports ${error}`);
    return res.status(500).json({message: 'There was an error while saving updated reports'});
  }
};

class GSMDownloadRouter extends RoutingInterface {
  /**
   * Create and bind routes for Germline Small Mutations Module
   *
   * @type {TrackingRouter}
   * @param {object} io - Socket.io connection
   */
  constructor(io) {
    super();
    this.io = io;

    // Export
    this.registerEndpoint('get', '/batch/download', tokenAuth); // Pseudo middleware. Runs before subsequent
    this.registerEndpoint('get', '/batch/download', batchExport);
  }
}

module.exports = GSMDownloadRouter;
