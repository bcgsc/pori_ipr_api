const HTTP_STATUS = require('http-status-codes');
const express = require('express');
const {Op} = require('sequelize');

const router = express.Router({mergeParams: true});

const db = require('../../models');
const logger = require('../../log');
const loginMiddleware = require('../../middleware/graphkb');

const {graphkbReviewStatus} = require('../../api/graphkb');
const {KB_PIVOT_MAPPING} = require('../../constants');

const attachReviewStatus = async (graphkbToken, kbMatches) => {
  if (kbMatches.length) {
    const reviewStatuses = await graphkbReviewStatus(graphkbToken, kbMatches);

    kbMatches.forEach((entry) => {
      const matchingKbValue = reviewStatuses.find((status) => {
        return status['@rid'] === entry.kbStatementId;
      });
      if (matchingKbValue) {
        entry.dataValues.reviewStatus = matchingKbValue.reviewStatus;
      } else {
        entry.dataValues.reviewStatus = null;
      }
      return entry;
    });
  }

  return kbMatches;
};

router.use(loginMiddleware);

// Middleware for kbMatches
router.param('kbMatch', async (req, res, next, kbMatchIdent) => {
  const {graphkbToken} = req;

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
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Error while trying to get kb match'}});
  }

  if (!result) {
    logger.error('Unable to locate kb match');
    return res.status(HTTP_STATUS.NOT_FOUND).json({error: {message: 'Unable to locate kb match'}});
  }

  const [resultWithReview] = await attachReviewStatus(graphkbToken, [result]);
  // Add kb match to request
  req.kbMatch = resultWithReview;
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
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to remove kb match'}});
    }
  });

// Routing for kb matches
router.route('/')
  .get(async (req, res) => {
    const {graphkbToken} = req;
    const {report: {id: reportId}, query: {matchedCancer, approvedTherapy, category}} = req;
    // Setup where clause
    const where = {
      reportId,
    };

    // Searching for specific type of alterations
    if (category) {
      where.category = {[Op.in]: category.split(',')};
    }

    if (matchedCancer !== undefined) {
      where.matchedCancer = matchedCancer;
    }

    if (approvedTherapy !== undefined) {
      where.approvedTherapy = approvedTherapy;
    }

    const options = {
      where,
      order: [['variantType', 'ASC'], ['variantId', 'ASC']],
    };

    try {
      // Get all alterations for this report
      const result = await db.models.kbMatches.scope('public').findAll(options);
      const resultWithReviews = await attachReviewStatus(graphkbToken, result);
      return res.json(resultWithReviews);
    } catch (error) {
      logger.error(`Unable to retrieve resource ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to retrieve resource'}});
    }
  });


module.exports = router;
