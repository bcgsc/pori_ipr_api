const HTTP_STATUS = require('http-status-codes');
const express = require('express');

const router = express.Router({mergeParams: true});
const db = require('../../models');

const logger = require('../../log');

router.param('mutation', async (req, res, next, mutIdent) => {
  let result;
  try {
    result = await db.models.smallMutations.scope('public').findOne({where: {ident: mutIdent}});
  } catch (error) {
    logger.error(`Unable to get somatic mutations ${error}`);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to get somatic mutations'}});
  }

  if (!result) {
    logger.error('Unable to locate somatic mutations');
    return res.status(HTTP_STATUS.NOT_FOUND).json({error: {message: 'Unable to locate somatic mutations'}});
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
      const result = await db.models.smallMutations.update(req.body, {
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
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to update somatic mutations'}});
    }
  })
  .delete(async (req, res) => {
    // Soft delete the entry
    // Update result
    try {
      await db.models.smallMutations.destroy({where: {ident: req.mutation.ident}});
      return res.json({success: true});
    } catch (error) {
      logger.error(`Unable to remove somatic mutations ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to remove somatic mutations'}});
    }
  });

// Routing for Alteration
router.route('/')
  .get(async (req, res) => {
    const {report: {ident: reportIdent}} = req;

    // Get all small mutations for this report
    try {
      const results = await db.models.smallMutations.scope('extended').findAll({
        order: [['geneId', 'ASC']],
        include: [
          {
            model: db.models.analysis_report,
            where: {ident: reportIdent},
            attributes: [],
            required: true,
            as: 'report',
          },
          {
            model: db.models.kbMatches,
            attributes: ['ident', 'category'],
          },
        ],
      });
      return res.json(results);
    } catch (error) {
      logger.error(`Unable to retrieve small mutations ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to retrieve small mutations'}});
    }
  });


module.exports = router;
