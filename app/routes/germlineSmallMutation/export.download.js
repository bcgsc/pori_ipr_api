const HTTP_STATUS = require('http-status-codes');
const Excel = require('exceljs');
const {Op} = require('sequelize');
const express = require('express');

const db = require('../../models');
const Variants = require('./util/variants');
const logger = require('../../log');
const {includesAll} = require('../../libs/helperFunctions');

const router = express.Router({mergeParams: true});

// Parse Mutation Landscape JSON array. Show modifier if there is one. Show associations if set. If sig has no associations, show number.
const parseMutationSignature = (arr) => {
  return arr.map((ls) => {
    return `${ls.kbCategory} ${(ls.associations !== '-') ? ls.associations : `Signature ${ls.signature}`}`;
  }).join('; ');
};

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
 * @property {string?} req.query.reviews - Comma separated list of reviews required for export
 *
 * @returns {Promise.<object>} - Returns response object
 */
router.get('/batch/download', async (req, res) => {
  const requiredReviews = req.query.reviews
    ? req.query.reviews.split(',')
    : [];

  let germlineReports;

  try {
    // Build list of reports that have been reviewed by both projects and biofx
    germlineReports = await db.models.germlineSmallMutation.findAll({
      where: {
        exported: false,
      },
      include: [
        {
          model: db.models.germlineSmallMutationVariant,
          as: 'variants',
          order: [['gene', 'asc']],
        },
        {
          model: db.models.germlineSmallMutationReview,
          as: 'reviews',
          required: Boolean(requiredReviews.length),
          include: [{model: db.models.user.scope('public'), as: 'reviewer'}],
        },
      ],
    });
  } catch (error) {
    logger.error(`Error while finding germline small mutation ${error}`);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Error while finding germline small mutation'}});
  }

  let matchedMutationSignatures; // find the most recent genomic report for the same patient/sample

  try {
    matchedMutationSignatures = await db.models.mutationSignature.findAll({
      where: {
        selected: true,
      },
      order: [['updatedAt', 'DESC']], // Gets us the most recent report worked on.
      include: [
        {
          model: db.models.report,
          as: 'report',
          where: {
            patientId: {
              [Op.in]: germlineReports.map((germReport) => {
                return germReport.patientId;
              }),
            },
            state: {
              [Op.in]: ['reviewed', 'active', 'completed'],
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
    const reportReviews = report.reviews.map((review) => {
      return review.type;
    });

    if (includesAll(reportReviews, requiredReviews)) {
      // contains all the required reviews
      const summaryMatch = matchedMutationSignatures.filter((signature) => {
        return signature.report.patientId === report.patientId;
      });

      const mutationSignature = summaryMatch.length > 0
        ? parseMutationSignature(summaryMatch)
        : 'N/A';

      for (const variant of report.variants.filter((v) => {
        return !v.hidden;
      })) {
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
  // Get current date in format: YYYY-MM-DD
  const date = new Date().toLocaleString('en-ca', {year: 'numeric', month: 'numeric', day: 'numeric'});

  workbook.subject = `Germline Small Mutation Reports Batch Export - ${date}`;
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
  res.setHeader('Content-Disposition', `attachment; filename=${date}.ipr.germline.export.xlsx`);
  res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');

  try {
    await workbook.xlsx.write(res);
  } catch (error) {
    logger.error(`There was an error while creating xlsx export ${error}`);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({message: 'There was an error while creating xlsx export'});
  }

  try {
    // Mark all exported reports in DB
    await Promise.all(germlineReports.map(async (report) => {
      const reportReviews = report.reviews.map((review) => {
        return review.type;
      });

      if (includesAll(reportReviews, requiredReviews)) {
        report.exported = true;
        return report.save({fields: ['exported'], hooks: false});
      }
      return null;
    }));
    return res.end();
  } catch (error) {
    logger.error(`There was an error while saving updated reports ${error}`);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({message: 'There was an error while saving updated reports'});
  }
});

module.exports = router;
