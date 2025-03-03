const HTTP_STATUS = require('http-status-codes');
const express = require('express');

const router = express.Router({mergeParams: true});

const db = require('../../models');
const logger = require('../../log');

// Middleware for small mutations
router.param('mutation', async (req, res, next, mutIdent) => {
  let result;
  try {
    result = await db.models.smallMutations.findOne({
      where: {ident: mutIdent, reportId: req.report.id},
      include: [
        {model: db.models.genes.scope('minimal'), as: 'gene'},
      ],
    });
  } catch (error) {
    logger.error(`Unable to get somatic mutations ${error}`);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: {message: 'Unable to get somatic mutations'},
    });
  }

  if (!result) {
    logger.error('Unable to locate somatic mutations');
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      error: {message: 'Unable to locate somatic mutations'},
    });
  }

  // Add small mutation to request
  req.mutation = result;
  return next();
});

// Handle requests for small mutations
router.route('/:mutation([A-z0-9-]{36})')
  .get((req, res) => {
    return res.json(req.mutation.view('public'));
  })
  .put(async (req, res) => {
    // Update db entry
    try {
      await req.mutation.update(req.body, {userId: req.user.id});
      await req.mutation.reload();
      return res.json(req.mutation.view('public'));
    } catch (error) {
      logger.error(`Unable to update somatic mutations ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Unable to update somatic mutations'},
      });
    }
  })
  .delete(async (req, res) => {
    // Soft delete the entry
    try {
      await req.mutation.destroy();
      return res.status(HTTP_STATUS.NO_CONTENT).send();
    } catch (error) {
      logger.error(`Unable to remove somatic mutations ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Unable to remove somatic mutations'},
      });
    }
  });

// Routing for Alteration
router.route('/')
  .get(async (req, res) => {
    // Get all small mutations for this report

    try {
      const results = await db.models.smallMutations.scope('extended').findAll({
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

      return res.json(results);
    } catch (error) {
      logger.error(`Unable to retrieve small mutations ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Unable to retrieve small mutations'},
      });
    }
  });

module.exports = router;
