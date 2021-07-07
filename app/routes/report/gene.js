const HTTP_STATUS = require('http-status-codes');
const express = require('express');

const db = require('../../models');
const logger = require('../../log');

const router = express.Router({mergeParams: true});

// Middleware for genes
router.param('geneName', async (req, res, next, geneName) => {
  let result;
  try {
    result = await db.models.genes.findOne({
      where: {
        reportId: req.report.id,
        name: geneName,
      },
    });
  } catch (error) {
    logger.error(`Unable to find gene ${error}`);
    return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message: 'Unable to find gene'}});
  }

  if (!result) {
    logger.error('Unable to locate gene');
    return res.status(HTTP_STATUS.NOT_FOUND).json({error: {message: 'Unable to locate gene'}});
  }

  // Add gene to request
  req.gene = result;
  return next();
});

// Handle requests for genes
router.route('/:geneName')
  .get((req, res) => {
    return res.json(req.gene.view('public'));
  })
  .put(async (req, res) => {
    try {
      await req.gene.update(req.body, {userId: req.user.id});
      return res.json(req.gene.view('public'));
    } catch (error) {
      logger.error(`Unable to update gene ${error}`);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message: 'Unable to update gene'}});
    }
  });


router.route('/')
  .get(async (req, res) => {
    // Get all targeted genes for this report
    try {
      const result = await db.models.genes.scope('public').findAll({
        where: {reportId: req.report.id},
        order: [['name', 'ASC']],
      });
      return res.json(result);
    } catch (error) {
      logger.error(`Unable to retrieve genes ${error}`);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message: 'Unable to retrieve genes'}});
    }
  });

module.exports = router;
