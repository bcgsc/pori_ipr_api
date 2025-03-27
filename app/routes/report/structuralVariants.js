const HTTP_STATUS = require('http-status-codes');
const express = require('express');

const router = express.Router({mergeParams: true});

const db = require('../../models');
const logger = require('../../log');
const cache = require('../../cache');

router.param('sv', async (req, res, next, svIdent) => {
  let result;
  try {
    result = await db.models.structuralVariants.findOne({
      where: {ident: svIdent, reportId: req.report.id},
      include: [
        {model: db.models.genes.scope('minimal'), foreignKey: 'gene1Id', as: 'gene1'},
        {model: db.models.genes.scope('minimal'), foreignKey: 'gene2Id', as: 'gene2'},
        {model: db.models.observedVariantAnnotations.scope('minimal'), as: 'observedVariantAnnotation'},
      ],
    });
  } catch (error) {
    logger.error(`Unable to get structural variant ${error}`);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: {message: 'Unable to get structural variant'},
    });
  }

  if (!result) {
    logger.error('Unable to locate structural variant');
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      error: {message: 'Unable to locate structural variant'},
    });
  }

  // Add structural variant to request
  req.variation = result;
  return next();
});

// Handle requests for alterations
router.route('/:sv([A-z0-9-]{36})')
  .get((req, res) => {
    return res.json(req.variation.view('public'));
  })
  .put(async (req, res) => {
    // Update db entry
    try {
      await req.variation.update(req.body, {userId: req.user.id});
      await req.variation.reload();
      return res.json(req.variation.view('public'));
    } catch (error) {
      logger.error(`Unable to update structural variant ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Unable to update structural variant'},
      });
    }
  })
  .delete(async (req, res) => {
    // Soft delete the entry
    try {
      await req.variation.destroy();
      return res.status(HTTP_STATUS.NO_CONTENT).send();
    } catch (error) {
      logger.error(`Unable to remove structural variant ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Unable to remove structural variant'},
      });
    }
  });

// Routing for Alteration
router.route('/')
  .get(async (req, res) => {
    // Get all structural variants (sv) for this report
    const key = `/reports/${req.report.ident}/structural-variants`;

    try {
      const cacheResults = await cache.get(key);

      if (cacheResults) {
        res.type('json');
        return res.send(cacheResults);
      }
    } catch (error) {
      logger.error(`Error while checking cache for structural variants ${error}`);
    }

    try {
      const results = await db.models.structuralVariants.scope('extended').findAll({
        order: [['gene1Id', 'ASC'], ['gene2Id', 'ASC']],
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
          {
            model: db.models.observedVariantAnnotations,
            as: 'observedVariantAnnotation',
          },
        ],
      });

      if (key) {
        cache.set(key, JSON.stringify(results), 'EX', 14400);
      }

      return res.json(results);
    } catch (error) {
      logger.error(`Unable to retrieve structural variants ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Unable to retrieve structural variants'},
      });
    }
  });

module.exports = router;
