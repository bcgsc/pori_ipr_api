const HTTP_STATUS = require('http-status-codes');
const express = require('express');
const {Op} = require('sequelize');

const router = express.Router({mergeParams: true});
const db = require('../../models');

const logger = require('../../log');

router.param('expressionVariant', async (req, res, next, ident) => {
  let result;
  try {
    result = await db.models.expressionVariants.scope('public').findOne({where: {ident}});
  } catch (error) {
    logger.error(`Unable to process request ${error}`);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to process the request'}});
  }

  if (!result) {
    logger.error(`Unable to find expressionVariants, ident: ${ident}`);
    return res.status(HTTP_STATUS.NOT_FOUND).json({error: {message: `Unable to find expressionVariants, ident: ${ident}`}});
  }

  req.expressionVariants = result;
  return next();
});

// Handle requests for expressionVariants
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
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to update expressionVariants'}});
    }
  })
  .delete(async (req, res) => {
    // Soft delete expressionVariants
    try {
      await db.models.expressionVariants.destroy({where: {ident: req.expressionVariants.ident}});
      return res.json({success: true});
    } catch (error) {
      logger.error(`Unable to remove expressionVariants ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to remove expressionVariants'}});
    }
  });

// Routing for all expression variants
router.route('/')
  .get(async (req, res) => {
    const {report: {ident: reportIdent}} = req;

    try {
      const results = await db.models.expressionVariants.scope('extended').findAll({
        order: [['geneId', 'ASC']],
        where: {
          expression_class: {[Op.ne]: null},
        },
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
      logger.error(`Unable to retrieve expressionVariants ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to retrieve expressionVariants'}});
    }
  });


module.exports = router;