const express = require('express');

const router = express.Router({mergeParams: true});
const db = require('../../../../models');

const logger = require('../../../../../lib/log');

router.param('alteration', async (req, res, next, altIdent) => {
  let result;
  try {
    result = await db.models.genomicAlterationsIdentified.scope('public').findOne({where: {ident: altIdent}});
  } catch (error) {
    logger.error(`Unable to get genomic alterations ${error}`);
    return res.status(500).json({error: {message: 'Unable to get genomic alterations', code: 'failedMiddlewareAlterationQuery'}});
  }

  if (!result) {
    logger.error('Unable to locate genomic alterations');
    return res.status(404).json({error: {message: 'Unable to locate genomic alterations', code: 'failedMiddlewareAlterationLookup'} });
  }

  req.alteration = result;
  return next();
});

// Handle requests for alterations
router.route('/:alteration([A-z0-9-]{36})')
  .get((req, res) => {
    return res.json(req.alteration);
  })
  .put(async (req, res) => {
    // Update DB Version for Entry
    try {
      const result = await db.models.genomicAlterationsIdentified.update(req.body, {
        where: {
          ident: req.alteration.ident,
        },
        paranoid: true,
        returning: true,
      });

      return res.json(result);
    } catch (error) {
      logger.error(`Unable to update genomic alterations ${error}`);
      return res.status(500).json({error: {message: 'Unable to update genomic alterations', code: 'failedAPClookup'}});
    }
  })
  .delete(async (req, res) => {
    // Soft delete the entry
    // Update result
    try {
      await db.models.genomicAlterationsIdentified.destroy({where: {ident: req.alteration.ident}});
    } catch (error) {
      logger.error(`Unable to remove genomic alterations ${error}`);
      return res.status(500).json({error: {message: 'Unable to remove genomic alterations', code: 'failedGenomicAlterationsIdentifiedRemove'}});
    }

    if (!req.query.cascade || req.query.cascade !== 'true') {
      return res.status(204).send();
    }

    // Check to see if we're propagating this down into Detailed Genomic
    const gene = req.alteration.geneVariant.split(/\s(.+)/);
    const where = {gene: gene[0], variant: gene[1].replace(/(\(|\))/g, ''), pog_report_id: req.report.id};

    try {
      await db.models.genomicEventsTherapeutic.destroy({where: {genomicEvent: req.alteration.geneVariant, pog_report_id: req.report.id}});
    } catch (error) {
      logger.error(`Unable to remove genomic events therapeutic ${error}`);
      return res.status(500).json({error: {message: 'Unable to remove genomic events therapeutic', code: 'failedGenomicAlterationsIdentifiedRemove'}});
    }

    // Cascade removal of variant through Detailed Genomic Analysis
    try {
      await db.models.alterations.destroy({where});
      return res.status(204).json();
    } catch (error) {
      logger.error(`Unable to cascade removal into detailed genomic analysis ${error}`);
      return res.status(500).json({status: true, message: 'Unable to cascade removal into detailed genomic analysis'});
    }
  });

// Routing for Alteration
router.route('/')
  .get(async (req, res) => {
    const options = {
      where: {
        pog_report_id: req.report.id,
      },
    };

    // Get all rows for this POG
    try {
      const results = await db.models.genomicAlterationsIdentified.scope('public').findAll(options);
      return res.json(results);
    } catch (error) {
      logger.error(`Unable to get all genomic alterations identified ${error}`);
      return res.status(500).json({error: {message: 'Unable to get all genomic alterations identified', code: 'failedGenomicAlterationsIdentifiedQuery'}});
    }
  })
  .post(async (req, res) => {
    // Add a new Potential Clinical Alteration...
    const alteration = req.body;
    alteration.pog_report_id = req.report.id;
    alteration.pog_id = req.report.pog_id;

    try {
      const result = await db.models.genomicAlterationsIdentified.create(alteration);
      return res.json(result);
    } catch (error) {
      logger.error(`Unable to create genomic alteration entry ${error}`);
      return res.status(500).json({error: {message: 'Unable to create genomic alteration entry', code: 'failedKeyGenomicAlterationCreateEntry'}});
    }
  });

module.exports = router;
