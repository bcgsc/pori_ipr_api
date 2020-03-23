const HTTP_STATUS = require('http-status-codes');
const express = require('express');

const router = express.Router({mergeParams: true});
const db = require('../../models');

const logger = require('../../log');

router.param('mutation', async (req, res, next, mutIdent) => {
  let result;
  try {
    result = await db.models.somaticMutations.scope('public').findOne({where: {ident: mutIdent}});
  } catch (error) {
    logger.error(`Unable to get somatic mutations ${error}`);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to get somatic mutations', code: 'failedMiddlewareSomaticMutationQuery'}});
  }

  if (!result) {
    logger.error('Unable to locate somatic mutations');
    return res.status(HTTP_STATUS.NOT_FOUND).json({error: {message: 'Unable to locate somatic mutations', code: 'failedMiddlewareSomaticMutationLookup'}});
  }

  req.mutation = result;
  return next();
});

// Handle requests for alterations
router.route('/:mutation([A-z0-9-]{36})')
  .get((req, res) => {
    return res.json(req.mutation);
  })
  .put(async (req, res) => {
    // Update DB Version for Entry
    try {
      const result = await db.models.somaticMutations.update(req.body, {
        where: {
          ident: req.mutation.ident,
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
      logger.error(`Unable to update somatic mutations ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to update somatic mutations', code: 'failedOutlierVersion'}});
    }
  })
  .delete(async (req, res) => {
    // Soft delete the entry
    // Update result
    try {
      await db.models.somaticMutations.destroy({where: {ident: req.mutation.ident}});
      return res.json({success: true});
    } catch (error) {
      logger.error(`Unable to remove somatic mutations ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to remove somatic mutations', code: 'failedSomaticMutationremove'}});
    }
  });

// Routing for Alteration
router.route('/:type(clinical|nostic|biological|unknown)?')
  .get(async (req, res) => {
    // Setup where clause
    const where = {reportId: req.report.id};

    // Searching for specific type of alterations
    if (req.params.type) {
      // Are we looking for approved types?
      where.mutationType = req.params.type;
    }

    const options = {
      where,
      order: [['geneId', 'ASC']],
    };

    // Get all small mutations for this report
    try {
      const results = await db.models.smallMutations.scope('public').findAll(options);
      return res.json(results);
    } catch (error) {
      logger.error(`Unable to retrieve small mutations ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to retrieve small mutations', code: 'failedSomaticMutationlookup'}});
    }
  });


module.exports = router;
