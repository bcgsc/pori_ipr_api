const HTTP_STATUS = require('http-status-codes');
const express = require('express');

const router = express.Router({mergeParams: true});
const db = require('../../models');

const logger = require('../../log');

router.param('gene', async (req, res, next, geneIdent) => {
  let result;
  try {
    result = await db.models.targetedGenes.scope('public').findOne({where: {ident: geneIdent}});
  } catch (error) {
    logger.error(`Unable to process request ${error}`);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to process the request', code: 'failedMiddlewareTargetedGeneQuery'}});
  }

  if (!result) {
    logger.error('Unable to locate the requested resource');
    return res.status(HTTP_STATUS.NOT_FOUND).json({error: {message: 'Unable to locate the requested resource', code: 'failedMiddlewareTargetedGeneLookup'}});
  }

  req.alteration = result;
  return next();
});

// Handle requests for alterations
router.route('/:gene([A-z0-9-]{36})')
  .get((req, res) => {
    return res.json(req.alteration);
  })
  .put(async (req, res) => {
    // Bump the version number for this entry
    req.body.ident = req.alteration.ident;
    req.body.reportId = req.report.id;

    try {
      const result = await db.models.kbMatches.update(req.body, {
        where: {
          ident: req.alteration.ident,
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
      logger.error(`Unable to update resource ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to update resource', code: 'failedTargetedGenelookup'}});
    }
  })
  .delete(async (req, res) => {
    // Soft delete the entry
    // Update result
    try {
      await db.models.kbMatches.destroy({where: {ident: req.alteration.ident}});
      return res.json({success: true});
    } catch (error) {
      logger.error(`Unable to remove resource ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to remove resource', code: 'failedTargetedGeneremove'}});
    }
  });

// Routing for Alteration
router.route('/')
  .get(async (req, res) => {
    // Setup where clause
    const where = {reportId: req.report.id};

    const options = {
      where,
      order: [['gene', 'ASC']],
    };

    // Get all targeted genes for this report
    try {
      const result = await db.models.probeResults.scope('public').findAll(options);
      return res.json(result);
    } catch (error) {
      logger.error(`Unable to retrieve resource ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to retrieve resource', code: 'failedTargetedGenelookup'}});
    }
  });

module.exports = router;
