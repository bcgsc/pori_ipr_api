const HTTP_STATUS = require('http-status-codes');
const express = require('express');

const router = express.Router({mergeParams: true});
const db = require('../../models');

const logger = require('../../log');

/*
 * Outliers
 *
 */
router.param('expressionVariant', async (req, res, next, ident) => {
  let result;
  try {
    result = await db.models.expressionVariants.scope('public').findOne({where: {ident}});
  } catch (error) {
    logger.error(`Unable to process request ${error}`);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to process the request', code: 'failedMiddlewareOutlierQuery'}});
  }

  if (!result) {
    logger.error(`Unable to find expressionVariants, ident: ${ident}`);
    return res.status(HTTP_STATUS.NOT_FOUND).json({error: {message: `Unable to find expressionVariants, ident: ${ident}`, code: 'failedMiddlewareOutlierLookup'}});
  }

  req.expressionVariants = result;
  return next();
});

// Handle requests for outliers
router.route('/:expressionVariant([A-z0-9-]{36})')
  .get((req, res) => {
    return res.json(req.expressionVariants);
  })
  .put(async (req, res) => {
    // Update DB Version for Entry
    try {
      const result = await db.models.expressionVariants.update(req.body, {
        where: {
          ident: req.expressionVariants.ident,
        },
        individualHooks: true,
        paranoid: true,
        returning: true,
      });

      // Get updated model data from update
      const [, [{dataValues}]] = result;

      // Remove id's and deletedAt properties from returned model
      const {
        id, reportId, deletedAt, ...publicModel
      } = dataValues;

      return res.json(publicModel);
    } catch (error) {
      logger.error(`Unable to update expressionVariants ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to update expressionVariants', code: 'failedOutlierVersion'}});
    }
  })
  .delete(async (req, res) => {
    // Soft delete expressionVariants
    try {
      await db.models.expressionVariants.destroy({where: {ident: req.expressionVariants.ident}});
      return res.json({success: true});
    } catch (error) {
      logger.error(`Unable to remove expressionVariants ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to remove expressionVariants', code: 'failedOutlierRemove'}});
    }
  });

// Routing for all Outliers
router.route('/')
  .get(async (req, res) => {
    // Setup where clause
    const where = {reportId: req.report.id};
    // Searching for specific type of expressionVariants
    if (req.params.type) {
      // Are we looking for approved types?
      where.outlierType = req.params.type;
    }

    const options = {
      where,
    };

    try {
      const results = await db.models.expressionVariants.scope('extended').findAll(options);
      return res.json(results);
    } catch (error) {
      logger.error(`Unable to retrieve outliers ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to retrieve outliers', code: 'failedOutlierlookup'}});
    }
  });


module.exports = router;
