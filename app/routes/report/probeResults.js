const HTTP_STATUS = require('http-status-codes');
const express = require('express');

const router = express.Router({mergeParams: true});
const db = require('../../models');

const logger = require('../../log');

router.param('target', async (req, res, next, altIdent) => {
  let result;
  try {
    result = await db.models.probeResults.scope('public').findOne({where: {ident: altIdent}});
  } catch (error) {
    logger.error(`Unable to find probe target ${error}`);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to find probe target', code: 'failedMiddlewareProbeTargetQuery'}});
  }

  if (!result) {
    logger.error('Unable to locate probe target');
    return res.status(HTTP_STATUS.NOT_FOUND).json({error: {message: 'Unable to locate probe target', code: 'failedMiddlewareProbeTargetLookup'}});
  }

  req.target = result;
  return next();
});

// Handle requests for alterations
router.route('/:target([A-z0-9-]{36})')
  .get((req, res) => {
    return res.json(req.target);
  })
  .put(async (req, res) => {
    // Update DB Version for Entry
    try {
      const result = await db.models.probeResults.update(req.body, {
        where: {
          ident: req.target.ident,
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
      logger.error(`Unable to update probe target ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to update probe target'}});
    }
  })
  .delete(async (req, res) => {
    // Soft delete the entry
    try {
      await db.models.probeResults.destroy({where: {ident: req.target.ident}});
      return res.status(HTTP_STATUS.NO_CONTENT).send();
    } catch (error) {
      logger.error(`Unable to remove probe target ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to remove probe target', code: 'failedProbeTargetremove'}});
    }
  });


router.route('/')
  .get(async (req, res) => {
    // Setup where clause
    const where = {reportId: req.report.id};

    const options = {
      where,
      order: [['geneId', 'ASC']],
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
