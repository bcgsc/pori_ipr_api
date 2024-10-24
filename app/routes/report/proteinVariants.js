const HTTP_STATUS = require('http-status-codes');
const express = require('express');

const router = express.Router({mergeParams: true});

const db = require('../../models');
const logger = require('../../log');
const cache = require('../../cache');

// Middleware for protein variants
router.param('proteinVariant', async (req, res, next, ident) => {
  let result;
  try {
    result = await db.models.proteinVariants.findOne({
      where: {ident, reportId: req.report.id},
      include: [
        {model: db.models.genes.scope('minimal'), as: 'gene'},
      ],
    });
  } catch (error) {
    logger.error(`Error while getting protein variant ${error}`);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Error while getting protein variant'}});
  }

  if (!result) {
    logger.error(`Unable to find protein variant, ident: ${ident}`);
    return res.status(HTTP_STATUS.NOT_FOUND).json({error: {message: `Unable to find protein variant, ident: ${ident}`}});
  }

  // Add protein variant to request
  req.proteinVariants = result;
  return next();
});

// Handle requests for proteinVariants
router.route('/:proteinVariant([A-z0-9-]{36})')
  .get((req, res) => {
    return res.json(req.proteinVariants.view('public'));
  })
  .put(async (req, res) => {
    // Update db entry
    try {
      await req.proteinVariants.update(req.body, {userId: req.user.id});
      await req.proteinVariants.reload();
      return res.json(req.proteinVariants.view('public'));
    } catch (error) {
      logger.error(`Unable to update protein variant ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to update protein variant'}});
    }
  })
  .delete(async (req, res) => {
    // Soft delete protein variant
    try {
      await req.proteinVariants.destroy();
      return res.status(HTTP_STATUS.NO_CONTENT).send();
    } catch (error) {
      logger.error(`Unable to remove protein variant ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to remove protein variant'}});
    }
  });

// Routing for all protein variants
router.route('/')
  .get(async (req, res) => {
    const key = `/reports/${req.report.ident}/protein-variants`;

    try {
      const cacheResults = await cache.get(key);

      if (cacheResults) {
        res.type('json');
        return res.send(cacheResults);
      }
    } catch (error) {
      logger.error(`Error while checking cache for protein variants ${error}`);
    }

    try {
      const results = await db.models.proteinVariants.scope('extended').findAll({
        order: [['geneId', 'ASC']],
        where: {
          reportId: req.report.id,
        },
        include: [
          {
            model: db.models.kbMatches,
            attributes: ['ident'],
            include: [
              {
                model: db.models.kbMatchedStatements,
                as: 'kbMatchedStatements',
                attributes:
                  ['category'],
                through: {attributes: []},
              },
            ],
          },
        ],
      });

      if (key) {
        cache.set(key, JSON.stringify(results), 'EX', 14400);
      }

      return res.json(results);
    } catch (error) {
      logger.error(`Unable to retrieve proteinVariants ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to retrieve proteinVariants'}});
    }
  });

module.exports = router;
