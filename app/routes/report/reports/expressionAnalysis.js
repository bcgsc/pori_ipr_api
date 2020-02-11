const HTTP_STATUS = require('http-status-codes');
const express = require('express');
const {Op} = require('sequelize');

const router = express.Router({mergeParams: true});
const db = require('../../../models');

const logger = require('../../../log');

/*
 * Outliers
 *
 */
router.param('outlier', async (req, res, next, oIdent) => {
  let result;
  try {
    result = await db.models.outlier.scope('public').findOne({where: {ident: oIdent, expType: {[Op.in]: ['rna', 'protein']}}});
  } catch (error) {
    logger.error(`Unable to process request ${error}`);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to process the request', code: 'failedMiddlewareOutlierQuery'}});
  }

  if (!result) {
    logger.error(`Unable to find outlier, ident: ${oIdent}`);
    return res.status(HTTP_STATUS.NOT_FOUND).json({error: {message: `Unable to find outlier, ident: ${oIdent}`, code: 'failedMiddlewareOutlierLookup'}});
  }

  req.outlier = result;
  return next();
});

// Handle requests for outliers
router.route('/outlier/:outlier([A-z0-9-]{36})')
  .get((req, res) => {
    return res.json(req.outlier);
  })
  .put(async (req, res) => {
    // Update DB Version for Entry
    try {
      const result = await db.models.outlier.update(req.body, {
        where: {
          ident: req.outlier.ident,
        },
        individualHooks: true,
        paranoid: true,
        returning: true,
      });

      // Get updated model data from update
      const [, [{dataValues}]] = result;

      // Remove id's and deletedAt properties from returned model
      const {
        id, report_id, deletedAt, ...publicModel
      } = dataValues;

      return res.json(publicModel);
    } catch (error) {
      logger.error(`Unable to update outlier ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to update outlier', code: 'failedOutlierVersion'}});
    }
  })
  .delete(async (req, res) => {
    // Soft delete outlier
    try {
      await db.models.outlier.destroy({where: {ident: req.outlier.ident}});
      return res.json({success: true});
    } catch (error) {
      logger.error(`Unable to remove outlier ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to remove outlier', code: 'failedOutlierRemove'}});
    }
  });

// Routing for all Outliers
router.route('/outlier/:type(clinical|nostic|biological)?')
  .get(async (req, res) => {
    // Setup where clause
    const where = {report_id: req.report.id, expType: {[Op.in]: ['rna', 'protein']}};
    // Searching for specific type of outlier
    if (req.params.type) {
      // Are we looking for approved types?
      where.outlierType = req.params.type;
    }

    const options = {
      where,
    };

    try {
      const results = await db.models.outlier.scope('public').findAll(options);
      return res.json(results);
    } catch (error) {
      logger.error(`Unable to retrieve outliers ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to retrieve outliers', code: 'failedOutlierlookup'}});
    }
  });

/*
 * Drug Targets
 *
 */
router.param('drugTarget', async (req, res, next, oIdent) => {
  let result;
  try {
    result = await db.models.drugTarget.scope('public').findOne({where: {ident: oIdent}});
  } catch (error) {
    logger.error(`Unable to process request ${error}`);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to process the request', code: 'failedMiddlewareOutlierQuery'}});
  }

  if (!result) {
    logger.error('Unable to locate drug target');
    return res.status(HTTP_STATUS.NOT_FOUND).json({error: {message: 'Unable to locate drug target', code: 'failedMiddlewareOutlierLookup'}});
  }

  req.drugTarget = result;
  return next();
});

// Handle requests for drugTarget
router.route('/drugTarget/:drugTarget([A-z0-9-]{36})')
  .get((req, res) => {
    return res.json(req.drugTarget);
  })
  .put(async (req, res) => {
    // Update DB Version for Entry
    try {
      const result = await db.models.drugTarget.update(req.body, {
        where: {
          ident: req.drugTarget.ident,
        },
        individualHooks: true,
        paranoid: true,
        returning: true,
      });

      // Get updated model data from update
      const [, [{dataValues}]] = result;

      // Remove id's and deletedAt properties from returned model
      const {
        id, report_id, deletedAt, ...publicModel
      } = dataValues;

      return res.json(publicModel);
    } catch (error) {
      logger.error(`Unable to update drug target ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to update drug target', code: 'failedMutationSummaryVersion'}});
    }
  })
  .delete(async (req, res) => {
    // Soft delete the entry
    try {
      await db.models.drugTarget.destroy({where: {ident: req.drugTarget.ident}});
      return res.json({success: true});
    } catch (error) {
      logger.error(`Unable to remove drug target ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to remove drug target', code: 'failedOutlierRemove'}});
    }
  });

// Routing for Alteration
router.route('/drugTarget')
  .get(async (req, res) => {
    const options = {
      where: {report_id: req.report.id},
      order: [['gene', 'ASC']],
    };

    // Get all drug targets for this report
    try {
      const result = await db.models.drugTarget.scope('public').findAll(options);
      return res.json(result);
    } catch (error) {
      logger.error(`Unable to retrieve drug target ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to retrieve drug target', code: 'failedOutlierlookup'}});
    }
  });

/** Protein Expression * */


router.param('protein', async (req, res, next, oIdent) => {
  let result;
  try {
    result = await db.models.outlier.scope('public').findOne({where: {ident: oIdent, expType: 'protein'}});
  } catch (error) {
    logger.error(`Unable to get outlier ${error}`);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to get outlier', code: 'failedMiddlewareProteinQuery'}});
  }

  if (!result) {
    logger.error('Unable to locate requested outlier');
    return res.status(HTTP_STATUS.NOT_FOUND).json({error: {message: 'Unable to locate requested outlier', code: 'failedMiddlewareProteinLookup'}});
  }

  req.outlier = result;
  return next();
});

// Handle requests for outliers
router.route('/protein/:protein([A-z0-9-]{36})')
  .get((req, res) => {
    return res.json(req.protein);
  })
  .put(async (req, res) => {
    // Update DB Version for Entry
    try {
      const result = await db.models.outlier.update(req.body, {
        where: {
          ident: req.protein.ident,
        },
        individualHooks: true,
        paranoid: true,
        returning: true,
      });

      // Get updated model data from update
      const [, [{dataValues}]] = result;

      // Remove id's and deletedAt properties from returned model
      const {
        id, report_id, deletedAt, ...publicModel
      } = dataValues;

      return res.json(publicModel);
    } catch (error) {
      logger.error(`Unable to update outlier ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to update outlier', code: 'failedProteinVersion'}});
    }
  })
  .delete(async (req, res) => {
    // Soft delete the entry
    try {
      await db.models.outlier.destroy({where: {ident: req.outlier.ident}});
      return res.json({success: true});
    } catch (error) {
      logger.error(`Unable to remove outlier ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to remove outlier', code: 'failedProteinRemove'}});
    }
  });

// Routing for all Outliers
router.route('/protein/:type(clinical|nostic|biological)?')
  .get(async (req, res) => {
    // Setup where clause
    const where = {report_id: req.report.id, expType: 'protein'};
    // Searching for specific type of outlier
    if (req.params.type) {
      // Are we looking for approved types?
      where.proteinType = req.params.type;
    }
    const options = {
      where,
    };

    // Get all outlier's for this report
    try {
      const results = await db.models.outlier.scope('public').findAll(options);
      return res.json(results);
    } catch (error) {
      logger.error(`Unable to retrieve outliers ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to retrieve outliers', code: 'failedProteinlookup'}});
    }
  });


module.exports = router;
