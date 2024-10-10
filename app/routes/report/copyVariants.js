const HTTP_STATUS = require('http-status-codes');
const express = require('express');
const {Op} = require('sequelize');

const router = express.Router({mergeParams: true});

const db = require('../../models');
const logger = require('../../log');
const cache = require('../../cache');

router.param('cnv', async (req, res, next, mutIdent) => {
  let result;
  try {
    result = await db.models.copyVariants.findOne({
      where: {ident: mutIdent, reportId: req.report.id},
      include: [
        {model: db.models.genes.scope('minimal'), as: 'gene'},
      ],
    });
  } catch (error) {
    logger.error(`Error while processing request ${error}`);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to process the request'}});
  }

  if (!result) {
    logger.error('Unable to locate the requested resource');
    return res.status(HTTP_STATUS.NOT_FOUND).json({error: {message: 'Unable to locate the requested resource'}});
  }

  // Add cnv to request
  req.cnv = result;
  return next();
});

// Handle requests for copy variant
router.route('/:cnv([A-z0-9-]{36})')
  .get((req, res) => {
    return res.json(req.cnv.view('public'));
  })
  .put(async (req, res) => {
    // Update db entry
    try {
      await req.cnv.update(req.body, {userId: req.user.id});
      await req.cnv.reload();
      return res.json(req.cnv.view('public'));
    } catch (error) {
      logger.error(`Unable to version copy variant ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to version copy variant'}});
    }
  })
  .delete(async (req, res) => {
    // Soft delete the entry
    try {
      await req.cnv.destroy();
      return res.status(HTTP_STATUS.NO_CONTENT).send();
    } catch (error) {
      logger.error(`Unable to remove copy variant ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to remove copy variant'}});
    }
  });

// Routing for report copy variants
router.route('/')
  .get(async (req, res) => {
    // Get all cnv's for this report
    const key = `/reports/${req.report.ident}/copy-variants`;

    try {
      const cacheResults = await cache.get(key);

      if (cacheResults) {
        res.type('json');
        return res.send(cacheResults);
      }
    } catch (error) {
      logger.error(`Error while checking cache for copy variants ${error}`);
    }

    try {
      const results = await db.models.copyVariants.scope('extended').findAll({
        order: [['geneId', 'ASC']],
        where: {
          reportId: req.report.id,
          cnvState: {[Op.ne]: null},
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
      logger.error(`Unable to retrieve resource ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to retrieve resource'}});
    }
  });

module.exports = router;
