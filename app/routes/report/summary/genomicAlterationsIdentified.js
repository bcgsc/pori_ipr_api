const HTTP_STATUS = require('http-status-codes');
const express = require('express');

const router = express.Router({mergeParams: true});
const db = require('../../../models');

const logger = require('../../../log');

// Middleware for genomic alterations
router.param('alteration', async (req, res, next, altIdent) => {
  let result;
  try {
    result = await db.models.genomicAlterationsIdentified.findOne({
      where: {ident: altIdent},
    });
  } catch (error) {
    logger.error(`Unable to get genomic alterations ${error}`);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to get genomic alterations'}});
  }

  if (!result) {
    logger.error('Unable to locate genomic alterations');
    return res.status(HTTP_STATUS.NOT_FOUND).json({error: {message: 'Unable to locate genomic alterations'}});
  }

  // Add genomic alteration to request
  req.alteration = result;
  return next();
});

// Handle requests for alterations
router.route('/:alteration([A-z0-9-]{36})')
  .get((req, res) => {
    return res.json(req.alteration.view('public'));
  })
  .put(async (req, res) => {
    // Update dn entry
    try {
      await req.alteration.update(req.body);
      return res.json(req.alteration.view('public'));
    } catch (error) {
      logger.error(`Unable to update genomic alterations ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to update genomic alterations'}});
    }
  })
  .delete(async (req, res) => {
    // Soft delete the entry
    // Update result
    try {
      await req.alteration.destroy();
    } catch (error) {
      logger.error(`Unable to remove genomic alterations ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to remove genomic alterations'}});
    }

    if (!req.query.cascade || req.query.cascade !== true) {
      return res.status(HTTP_STATUS.NO_CONTENT).send();
    }

    // Check to see if we're propagating this down into Detailed Genomic
    const gene = req.alteration.geneVariant.split(/\s(.+)/);
    const where = {gene: gene[0], variant: gene[1].replace(/(\(|\))/g, ''), reportId: req.report.id};

    // Cascade removal of variant through Detailed Genomic Analysis
    try {
      await db.models.alterations.destroy({where});
      return res.status(HTTP_STATUS.NO_CONTENT).send();
    } catch (error) {
      logger.error(`Unable to cascade removal into detailed genomic analysis ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({status: true, message: 'Unable to cascade removal into detailed genomic analysis'});
    }
  });

// Routing for Alteration
router.route('/')
  .get(async (req, res) => {
    // Get all the genomic alterations for this report
    try {
      const results = await db.models.genomicAlterationsIdentified.scope('public').findAll({
        where: {
          reportId: req.report.id,
        },
      });
      return res.json(results);
    } catch (error) {
      logger.error(`Unable to get all genomic alterations identified ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to get all genomic alterations identified'}});
    }
  })
  .post(async (req, res) => {
    // Add a new genomic alteration
    try {
      req.body.reportId = req.report.id;

      const result = await db.models.genomicAlterationsIdentified.create(req.body);
      return res.json(result.view('public'));
    } catch (error) {
      logger.error(`Unable to create genomic alteration entry ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to create genomic alteration entry'}});
    }
  });

module.exports = router;
