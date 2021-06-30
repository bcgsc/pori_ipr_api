const HTTP_STATUS = require('http-status-codes');
const express = require('express');

const router = express.Router({mergeParams: true});

const db = require('../../models');
const logger = require('../../log');

router.param('target', async (req, res, next, altIdent) => {
  let result;
  try {
    result = await db.models.probeResults.findOne({
      where: {ident: altIdent, reportId: req.report.id},
      include: [
        {model: db.models.genes.scope('minimal'), as: 'gene'},
      ],
    });
  } catch (error) {
    logger.error(`Unable to find probe target ${error}`);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to find probe target'}});
  }

  if (!result) {
    logger.error('Unable to locate probe target');
    return res.status(HTTP_STATUS.NOT_FOUND).json({error: {message: 'Unable to locate probe target'}});
  }

  // Add probe result to request
  req.target = result;
  return next();
});

// Handle requests for probe results
router.route('/:target([A-z0-9-]{36})')
  .get((req, res) => {
    return res.json(req.target.view('public'));
  })
  .put(async (req, res) => {
    // Update db entry
    try {
      await req.target.update(req.body, {userId: req.user.id});
      await req.target.reload();
      return res.json(req.target.view('public'));
    } catch (error) {
      logger.error(`Unable to update probe target ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to update probe target'}});
    }
  })
  .delete(async (req, res) => {
    // Soft delete the entry
    try {
      await req.target.destroy();
      return res.status(HTTP_STATUS.NO_CONTENT).send();
    } catch (error) {
      logger.error(`Unable to remove probe target ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to remove probe target'}});
    }
  });


router.route('/')
  .get(async (req, res) => {
    // Get all targeted genes for this report
    try {
      const result = await db.models.probeResults.scope('public').findAll({
        where: {reportId: req.report.id},
        order: [['geneId', 'ASC']],
      });
      return res.json(result);
    } catch (error) {
      logger.error(`Unable to retrieve resource ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to retrieve resource'}});
    }
  });

module.exports = router;
