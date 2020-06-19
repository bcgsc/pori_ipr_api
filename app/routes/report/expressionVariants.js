const HTTP_STATUS = require('http-status-codes');
const express = require('express');
const {Op} = require('sequelize');

const router = express.Router({mergeParams: true});

const db = require('../../models');
const logger = require('../../log');

// Middleware for expression variants
router.param('expressionVariant', async (req, res, next, ident) => {
  let result;
  try {
    result = await db.models.expressionVariants.findOne({
      where: {ident},
      include: [
        {model: db.models.genes.scope('minimal'), as: 'gene'},
      ],
    });
  } catch (error) {
    logger.error(`Error while getting expression variant ${error}`);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Error while getting expression variant'}});
  }

  if (!result) {
    logger.error(`Unable to find expression variant, ident: ${ident}`);
    return res.status(HTTP_STATUS.NOT_FOUND).json({error: {message: `Unable to find expression variant, ident: ${ident}`}});
  }

  // Add expression variant to request
  req.expressionVariants = result;
  return next();
});

// Handle requests for expressionVariants
router.route('/:expressionVariant([A-z0-9-]{36})')
  .get((req, res) => {
    return res.json(req.expressionVariants.view('public'));
  })
  .put(async (req, res) => {
    // Update db entry
    try {
      await req.expressionVariants.update(req.body);
      await req.expressionVariants.reload();
      return res.json(req.expressionVariants.view('public'));
    } catch (error) {
      logger.error(`Unable to update expression variant ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to update expression variant'}});
    }
  })
  .delete(async (req, res) => {
    // Soft delete expression variant
    try {
      await req.expressionVariants.destroy();
      return res.status(HTTP_STATUS.NO_CONTENT).send();
    } catch (error) {
      logger.error(`Unable to remove expression variant ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to remove expression variant'}});
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
          expressionState: {[Op.ne]: null},
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
