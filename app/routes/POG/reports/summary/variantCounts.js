const HTTP_STATUS = require('http-status-codes');
const express = require('express');

const router = express.Router({mergeParams: true});
const db = require('../../../../models');
const logger = require('../../../../log');

// Middleware for Variant Counts
router.use('/', async (req, res, next) => {
  // Get Mutation Summary for this POG
  let result;
  try {
    result = await db.models.variantCounts.findOne({
      where: {
        reportId: req.report.id,
      },
      attributes: {exclude: ['id', '"deletedAt"']},
    });
  } catch (error) {
    logger.error(`Unable to lookup variant counts for ${req.POG.POGID} error: ${error}`);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: `Unable to lookup variant counts for ${req.POG.POGID}`, code: 'failedVariantCountsQuery'}});
  }

  if (!result) {
    logger.error(`Unable to find variant counts for ${req.POG.POGID}`);
    return res.status(HTTP_STATUS.NOT_FOUND).json({error: {message: `Unable to find variant counts for ${req.POG.POGID}`, code: 'failedVariantCountsLookup'}});
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
        individualHooks: true,
        paranoid: true,
        returning: true,
      });

      // Get updated model data from update
      const [, [{dataValues}]] = result;

      // Remove id's and deletedAt properties from returned model
      const {
        id, pog_id, reportId, deletedAt, ...publicModel
      } = dataValues;

      return res.json(publicModel);
    } catch (error) {
      logger.error(`Unable to update variant counts ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to update variant counts', code: 'failedVariantCountsVersion'}});
    }
  });

module.exports = router;
