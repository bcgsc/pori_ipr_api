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
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to process the request', code: 'failedMiddlewareAlterationQuery'}});
  }

  if (!result) {
    logger.error('Unable to locate the requested resource');
    return res.status(HTTP_STATUS.NOT_FOUND).json({error: {message: 'Unable to locate the requested resource', code: 'failedMiddlewareAlterationLookup'}});
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
router.route('/:category(therapeutic|biological|prognostic|diagnostic|unknown|novel|thisCancer|otherCancer)?')
  .get(async (req, res) => {
    const {params: {category}} = req;
    // Setup where clause
    const where = {
      reportId: req.report.id,
    };

    // Searching for specific type of alterations
    if (category) {
      // Are we looking for approved types?
      if (category.includes('Cancer')) {
        where.approvedTherapy = category;
      } else {
        where.category = category;
        where.approvedTherapy = null;
      }
    } else {
      where.approvedTherapy = null;
      where.category = {[Op.notIn]: ['unknown', 'novel']};
    }

    const options = {
      where,
      order: [['gene', 'ASC']],
    };

    try {
      // Get all alterations for this report
      const result = await db.models.kbMatches.scope('public').findAll(options);
      return res.json(result);
    } catch (error) {
      logger.error(`Unable to retrieve resource ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to retrieve resource', code: 'failedAPClookup'}});
    }
  });


module.exports = router;
