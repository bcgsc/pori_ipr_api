const HTTP_STATUS = require('http-status-codes');
const express = require('express');
const {Op} = require('sequelize');

const router = express.Router({mergeParams: true});
const kbMatchMiddleware = require('../../../middleware/kbMatch');

const db = require('../../../models');
const logger = require('../../../log');
const {KB_PIVOT_MAPPING} = require('../../../constants');

router.param('kbMatch', kbMatchMiddleware);

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

    const statementParams = [matchedCancer, approvedTherapy, category, iprEvidenceLevel];
    let statementRequired = false;
    if (statementParams.some((param) => {return param !== null;})) {
      statementRequired = true;
    }

    try {
      const results = await db.models.kbMatches.scope('public').findAll({
        where: {
          reportId: req.report.id,
        },
        order: [['variantType', 'ASC'], ['variantId', 'ASC']],
        include: [
          {
            model: db.models.kbMatchedStatements,
            as: 'kbMatchedStatements',
            attributes: {
              exclude: ['id', 'deletedAt', 'updatedAt', 'createdAt', 'updatedBy', 'reportId'],
            },
            where: {
              ...((iprEvidenceLevel) ? {iprEvidenceLevel: {[Op.in]: iprEvidenceLevel.split(',')}} : {}),
              ...((category) ? {category: {[Op.in]: category.split(',')}} : {}),
              ...((typeof matchedCancer === 'boolean') ? {matchedCancer} : {}),
              ...((typeof approvedTherapy === 'boolean') ? {approvedTherapy} : {}),
            },
            through: {attributes: []},
            required: statementRequired,
          },
          ...Object.values(KB_PIVOT_MAPPING).map((modelName) => {
            return {model: db.models[modelName].scope('public'), as: modelName};
          }),
        ],
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
