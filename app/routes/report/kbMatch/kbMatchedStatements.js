const HTTP_STATUS = require('http-status-codes');
const express = require('express');
const {Op} = require('sequelize');

const router = express.Router({mergeParams: true});

const db = require('../../../models');
const logger = require('../../../log');

// Middleware for kbMatchedStatements
router.param('kbMatchedStatement', async (req, res, next, kbMatchedStatementIdent) => {
  let result;
  try {
    result = await db.models.kbMatchedStatements.findOne({
      where: {ident: kbMatchedStatementIdent, reportId: req.report.id},
    });
  } catch (error) {
    logger.log(`Error while trying to get kb matched statement ${error}`);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: {message: 'Error while trying to get kb matched statement'},
    });
  }

  if (!result) {
    logger.error('Unable to locate kb matched statement');
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      error: {message: 'Unable to locate kb matched statement'},
    });
  }

  req.kbMatchedStatement = result;
  return next();
});

// Handle requests for kb match
router.route('/:kbMatchedStatement([A-z0-9-]{36})')
  .get((req, res) => {
    return res.json(req.kbMatchedStatement.view('public'));
  })
  .delete(async (req, res) => {
    // Soft delete the entry
    try {
      const binding = await db.models.kbMatchJoin.findOne({
        where: {kbMatchId: req.kbMatch.id, kbMatchedStatementId: req.kbMatchedStatement.id},
      });

      if (!binding) {
        logger.error(`Variant: ${req.kbMatch.ident} is not bound to statement: ${req.kbMatchedStatement.ident}`);
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          error: {message: 'Variant is not bound to Statement'},
        });
      }

      await binding.destroy();
      return res.status(HTTP_STATUS.NO_CONTENT).send();
    } catch (error) {
      logger.error(`Unable to remove kb matched statement ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Unable to remove kb matched statement'},
      });
    }
  });

router.route('/')
  .get(async (req, res) => {
    const {query: {matchedCancer, approvedTherapy, category, iprEvidenceLevel}} = req;

    try {
      const results = await db.models.kbMatchedStatements.scope('public').findAll({
        where: {
          reportId: req.report.id,
          ...((iprEvidenceLevel) ? {iprEvidenceLevel: {[Op.in]: iprEvidenceLevel.split(',')}} : {}),
          ...((category) ? {category: {[Op.in]: category.split(',')}} : {}),
          ...((typeof matchedCancer === 'boolean') ? {matchedCancer} : {}),
          ...((typeof approvedTherapy === 'boolean') ? {approvedTherapy} : {}),
        },
        include: [
          {
            model: db.models.kbMatches,
            as: 'kbMatches',
            attributes: {attributes: []},
            where: {
              id: req.kbMatch.id,
            },
            through: {attributes: []},
          },
        ],
      });

      return res.json(results);
    } catch (error) {
      logger.error(`Unable to get kb matched statements ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Unable to get kb matched statements'},
      });
    }
  });

module.exports = router;
