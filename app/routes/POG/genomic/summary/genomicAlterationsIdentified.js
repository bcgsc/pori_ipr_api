const HTTP_STATUS = require('http-status-codes');
const express = require('express');

const router = express.Router({mergeParams: true});
const db = require('../../../../models');

const logger = require('../../../../log');

router.param('alteration', async (req, res, next, altIdent) => {
  let result;
  try {
    result = await db.models.genomicAlterationsIdentified.scope('public').findOne({where: {ident: altIdent}});
  } catch (error) {
    logger.error(`Unable to get genomic alterations ${error}`);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to get genomic alterations', code: 'failedMiddlewareAlterationQuery'}});
  }

  if (!result) {
    logger.error('Unable to locate genomic alterations');
    return res.status(HTTP_STATUS.NOT_FOUND).json({error: {message: 'Unable to locate genomic alterations', code: 'failedMiddlewareAlterationLookup'} });
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
        individualHooks: true,
        paranoid: true,
        returning: true,
      });

      // Get updated model data from update
      const [, [{dataValues}]] = result;

      // Remove id's and deletedAt properties from returned model
      const {
        id, pog_id, report_id, deletedAt, ...publicModel
      } = dataValues;

      return res.json(publicModel);
    } catch (error) {
      logger.error(`Unable to update genomic alterations ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to update genomic alterations', code: 'failedAPClookup'}});
    }
  })
  .delete(async (req, res) => {
    // Soft delete the entry
    // Update result
    try {
      await db.models.genomicAlterationsIdentified.destroy({where: {ident: req.alteration.ident}});
    } catch (error) {
      logger.error(`Unable to remove genomic alterations ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to remove genomic alterations', code: 'failedGenomicAlterationsIdentifiedRemove'}});
    }

    if (!req.query.cascade || req.query.cascade !== 'true') {
      return res.status(HTTP_STATUS.NO_CONTENT).send();
    }

    // Check to see if we're propagating this down into Detailed Genomic
    const gene = req.alteration.geneVariant.split(/\s(.+)/);
    const where = {gene: gene[0], variant: gene[1].replace(/(\(|\))/g, ''), report_id: req.report.id};

    try {
      await db.models.genomicEventsTherapeutic.destroy({where: {genomicEvent: req.alteration.geneVariant, report_id: req.report.id}});
    } catch (error) {
      logger.error(`Unable to remove genomic events therapeutic ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to remove genomic events therapeutic', code: 'failedGenomicAlterationsIdentifiedRemove'}});
    }

    // Cascade removal of variant through Detailed Genomic Analysis
    try {
      await db.models.alterations.destroy({where});
      return res.status(HTTP_STATUS.NO_CONTENT).json();
    } catch (error) {
      logger.error(`Unable to cascade removal into detailed genomic analysis ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({status: true, message: 'Unable to cascade removal into detailed genomic analysis'});
    }
  });

// Routing for Alteration
router.route('/')
  .get(async (req, res) => {
    const options = {
      where: {
        report_id: req.report.id,
      },
    };

    // Get all rows for this POG
    try {
      const results = await db.models.genomicAlterationsIdentified.scope('public').findAll(options);
      return res.json(results);
    } catch (error) {
      logger.error(`Unable to get all genomic alterations identified ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to get all genomic alterations identified', code: 'failedGenomicAlterationsIdentifiedQuery'}});
    }
  })
  .post(async (req, res) => {
    // Add a new Potential Clinical Alteration...
    const alteration = req.body;
    alteration.report_id = req.report.id;
    alteration.pog_id = req.report.pog_id;

    try {
      const result = await db.models.genomicAlterationsIdentified.create(alteration);
      return res.json(result);
    } catch (error) {
      logger.error(`Unable to create genomic alteration entry ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to create genomic alteration entry', code: 'failedKeyGenomicAlterationCreateEntry'}});
    }
  });

module.exports = router;
