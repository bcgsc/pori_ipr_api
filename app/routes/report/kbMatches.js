const HTTP_STATUS = require('http-status-codes');
const express = require('express');
const {Op} = require('sequelize');

const router = express.Router({mergeParams: true});
const db = require('../../models');

const logger = require('../../log');

router.param('kbMatch', async (req, res, next, kbMatchIdent) => {
  let result;
  try {
    result = await db.models.kbMatches.scope('public').findOne({where: {ident: kbMatchIdent}});
  } catch (error) {
    logger.log(`Unable to process the request ${error}`);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to process the request'}});
  }

  if (!result) {
    logger.error('Unable to locate the requested resource');
    return res.status(HTTP_STATUS.NOT_FOUND).json({error: {message: 'Unable to locate the requested resource'}});
  }

  req.kbMatch = result;
  return next();
});

// Handle requests for alterations
router.route('/:kbMatch([A-z0-9-]{36})')
  .get((req, res) => {
    return res.json(req.kbMatch);
  });

// Routing for Alteration
router.route('/')
  .get(async (req, res) => {
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
      const result = await db.models.kbMatches.scope('extended').findAll(options);
      return res.json(result);
    } catch (error) {
      logger.error(`Unable to retrieve resource ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to retrieve resource'}});
    }
  });


module.exports = router;
