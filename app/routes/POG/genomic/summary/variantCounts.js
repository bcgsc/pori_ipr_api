const express = require('express');

const router = express.Router({mergeParams: true});
const db = require('../../../../models');
const logger = require('../../../../../lib/log');

// Middleware for Variant Counts
router.use('/', async (req, res, next) => {
  // Get Mutation Summary for this POG
  let result;
  try {
    result = await db.models.variantCounts.findOne({
      where: {
        pog_report_id: req.report.id,
      },
      attributes: {exclude: ['id', '"deletedAt"']},
    });
  } catch (error) {
    logger.error(`Unable to lookup variant counts for ${req.POG.POGID} error: ${error}`);
    return res.status(500).json({error: {message: `Unable to lookup variant counts for ${req.POG.POGID}`, code: 'failedVariantCountsQuery'}});
  }

  if (!result) {
    logger.error(`Unable to find variant counts for ${req.POG.POGID}`);
    return res.status(404).json({error: {message: `Unable to find variant counts for ${req.POG.POGID}`, code: 'failedVariantCountsLookup'}});
  }

  // Found the patient information
  req.variantCounts = result;
  return next();
});

// Handle requests for Variant Counts
router.route('/')
  .get((req, res) => {
    return res.json(req.variantCounts);
  })
  .put(async (req, res) => {
    // Update DB Version for Entry
    try {
      const result = await db.models.variantCounts.update(req.body, {
        where: {
          ident: req.variantCounts.ident,
        },
        paranoid: true,
        returning: true,
      });

      return res.json(result);
    } catch (error) {
      logger.error(`Unable to update variant counts ${error}`);
      return res.status(500).json({error: {message: 'Unable to update variant counts', code: 'failedVariantCountsVersion'}});
    }
  });

module.exports = router;
