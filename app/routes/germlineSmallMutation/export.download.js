const HTTP_STATUS = require('http-status-codes');
const Excel = require('exceljs');
const moment = require('moment');
const {Op} = require('sequelize');
const express = require('express');

const db = require('../../models');
const Variants = require('./util/germline_small_mutation_variant');
const logger = require('../../log');

const router = express.Router({mergeParams: true});


// Parse Mutation Landscape JSON array. Show modifier if there is one. Show associations if set. If sig has no associations, show number.
const parseMutationSignature = (arr) => {
  return arr.map((ls) => { return `${ls.modifier} ${(ls.associations !== '-') ? ls.associations : `Signature ${ls.signature}`}`; }).join('; ');
};

/**
 * Flash Token Authentication and user injection
 *
 * @param {object} req - Express request
 * @param {object} res - Express response
 * @param {function} next - Callback function
 *
 * @property {sequelize.DataTypes.UUID} req.query.flash_token - Flash token UUID
 *
 * @returns {Promise.<number>} - Returns number of destroyed rows by deleting flash token from db
 */
router.get('/batch/download', async (req, res, next) => {
  // Check for authentication token
  if (!req.query.flash_token) {
    return res.status(HTTP_STATUS.FORBIDDEN).json({message: 'A flash token is required in the url parameter: flash_token'});
  }

  try {
    const flashToken = await db.models.flash_token.findOne({
      where: {token: req.query.flash_token},
      include: [{model: db.models.user, as: 'user'}],
    });

    if (!flashToken) {
      logger.error('A valid flash token is required to download reports');
      return res.status(HTTP_STATUS.FORBIDDEN).json({message: 'A valid flash token is required to download reports'});
    }

    req.user = flashToken.user;
    req.flash_token = flashToken;

    next();

    return flashToken.destroy();
  } catch (error) {
    logger.error(error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Failed to query for flash token provided'}});
  }
});

/**
 * Generate Batch Export
 *
 * Get a batch export of all report variants that have not been exported yet
 *
 * GET /export/batch
 *
 * @param {object} req - Express request
 * @param {object} res - Express response
 *
 * @property {object} req.flash_token - Flash token
 * @property {string?} req.query.reviews - Comma separated list of reviews required for export
 *
 * @returns {Promise.<object>} - Returns response object
 */
router.get('/batch/download', async (req, res) => {
  if (!req.flash_token) {
    logger.error('Missing flash token');
    return res.status(HTTP_STATUS.FORBIDDEN).send({message: 'A flash token is required in the url parameter: flash_token'});
  }

  const requiredReviews = req.query.reviews.split(',');

  let germlineReports;

  try {
    // Build list of reports that have been reviewed by both projects and biofx
    germlineReports = await db.models.germline_small_mutation.findAll({
      where: {
        exported: false,
      },
      include: [
        {
          model: db.models.germline_small_mutation_variant,
          as: 'variants',
          required: true,
          order: [['gene', 'asc']],
        },
        {
          model: db.models.germline_small_mutation_review,
          as: 'reviews',
          required: true,
          include: [{model: db.models.user.scope('public'), as: 'reviewedBy'}],
        },
      ],
    });
  } catch (error) {
    logger.error(`Error while finding germline small mutation ${error}`);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Error while finding germline small mutation'}});
  }

  let matchedReportSummaries; // find the most recent genomic report for the same patient/sample

  try {
    matchedReportSummaries = await db.models.tumourAnalysis.findAll({
      order: [['updatedAt', 'DESC']], // Gets us the most recent report worked on.
      include: [
        {
          model: db.models.analysis_report,
          as: 'report',
      where: {
        patientId: {
              [Op.in]: germlineReports.map((germReport) => { return germReport.patientId; }),
        },
            state: {
          [Op.in]: ['presented', 'active', 'archived'],
        },
      },
          required: true,
        },
      ],
    });
  } catch (error) {
    logger.error(`Error while trying to get tumour analysis ${error}`);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Error while trying to get tumour analysis'}});
  }

  const variants = [];

  // Loop through reports, and ensure they have all required reviews
  for (const report of germlineReports) {
    // Ensure all required reviews are present on report
    const reportReviews = report.reviews.map((review) => { return review.type; });

    if (requiredReviews.every((state) => { return reportReviews.include(state); })) {
      // contains all the required reviews
      const summaryMatch = matchedReportSummaries.find((summary) => {
        return summary.report.patientId === report.patientId;
      });

      const mutationSignature = summaryMatch
        ? parseMutationSignature(summaryMatch.mutationSignature)
        : 'N/A';

      for (const variant of report.variants.filter((v) => { return !v.hidden; })) {
        variants.push({
          ...variant.toJSON(),
          sample: `${report.patientId}_${report.normalLibrary}`,
          biopsy: report.biopsyName,
          mutation_landscape: mutationSignature,
        });
      }
    }
  }

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
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({message: 'There was an error while creating xlsx export'});
  }

  try {
    // Mark all exported reports in DB
    await Promise.all(germlineReports.map(async (report) => {
      report.exported = true;
      return report.save();
    }));
    return res.end();
  } catch (error) {
    logger.error(`There was an error while saving updated reports ${error}`);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({message: 'There was an error while saving updated reports'});
  }
});

module.exports = router;
