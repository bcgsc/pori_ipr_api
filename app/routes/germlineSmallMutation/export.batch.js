const HTTP_STATUS = require('http-status-codes');
const Excel = require('exceljs');
const _ = require('lodash');
const express = require('express');

const logger = require('../../log');
const db = require('../../models');

const Variants = require('./util/germline_small_mutation_variant');

const router = express.Router({mergeParams: true});

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
const batchExport = async (req, res) => {
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
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({message: 'Error while finding germline small mutations'});
  }

  let variants = [];
  // Loop through reports, and ensure they have all required reviews
  smallMutations.forEach((value) => {
    // Ensure all required reviews are present on report
    if (_.intersection(req.query.reviews.split(','),
      value.reviews.map((review) => { return review.type; })).length > req.query.reviews.split(',').length) {
      return;
    }

    const availableVariants = value.variants.filter((variant) => {
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
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({message: 'Error while writing xlsx export of recent reports'});
  }
};

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
const getExportFlashToken = async (req, res) => {
  try {
    const flashToken = await db.models.flash_token.create({user_id: req.user.id, resource: 'gsm_export'});
    return res.json({token: flashToken.token});
  } catch (error) {
    logger.error(`Error while trying to create flash token ${error}`);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({message: 'Error while trying to create flash token'});
  }
};

// Export
router.get('/token', getExportFlashToken);
router.get('/', batchExport);

module.exports = router;
