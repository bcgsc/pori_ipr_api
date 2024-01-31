const HTTP_STATUS = require('http-status-codes');
const express = require('express');
const {Op} = require('sequelize');

const router = express.Router({mergeParams: true});

const db = require('../../models');
const logger = require('../../log');
const {KB_PIVOT_MAPPING} = require('../../constants');

// Middleware for kbMatches
router.param('kbMatch', async (req, res, next, kbMatchIdent) => {
  let result;
  try {
    result = await db.models.kbMatches.findOne({
      where: {ident: kbMatchIdent, reportId: req.report.id},
      include: Object.values(KB_PIVOT_MAPPING).map((modelName) => {
        return {model: db.models[modelName].scope('public'), as: modelName};
      }),
    });
  } catch (error) {
    logger.log(`Error while trying to get kb match ${error}`);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: {message: 'Error while trying to get kb match'},
    });
  }

  if (!result) {
    logger.error('Unable to locate kb match');
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      error: {message: 'Unable to locate kb match'},
    });
  }

  req.kbMatch = result;
  return next();
});

// Handle requests for kb match
router.route('/:kbMatch([A-z0-9-]{36})')
  .get((req, res) => {
    return res.json(req.kbMatch.view('public'));
  })
  .delete(async (req, res) => {
    // Soft delete the entry
    try {
      await req.kbMatch.destroy();
      return res.status(HTTP_STATUS.NO_CONTENT).send();
    } catch (error) {
      logger.error(`Unable to remove kb match ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Unable to remove kb match'},
      });
    }
  });

router.route('/')
  .get(async (req, res) => {
    const {query: {matchedCancer, approvedTherapy, category, iprEvidenceLevel}} = req;

    try {
      const results = await db.models.kbMatches.scope('public').findAll({
        where: {
          reportId: req.report.id,
          ...((iprEvidenceLevel) ? {iprEvidenceLevel: {[Op.in]: iprEvidenceLevel.split(',')}} : {}),
          ...((category) ? {category: {[Op.in]: category.split(',')}} : {}),
          ...((typeof matchedCancer === 'boolean') ? {matchedCancer} : {}),
          ...((typeof approvedTherapy === 'boolean') ? {approvedTherapy} : {}),
        },
        order: [['variantType', 'ASC'], ['variantId', 'ASC']],
      });

      return res.json(results);
    } catch (error) {
      logger.error(`Unable to get kb matches ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Unable to get kb matches'},
      });
    }
  });

module.exports = router;
