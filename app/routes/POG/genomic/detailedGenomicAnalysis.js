const express = require('express');
const {Op} = require('sequelize');

const router = express.Router({mergeParams: true});
const db = require('../../../models');

const logger = require('../../../log');

router.param('alteration', async (req, res, next, altIdent) => {
  let result;
  try {
    result = await db.models.alterations.scope('public').findOne({where: {ident: altIdent}});
  } catch (error) {
    logger.log(`Unable to process the request ${error}`);
    return res.status(500).json({error: {message: 'Unable to process the request', code: 'failedMiddlewareAlterationQuery'}});
  }

  if (!result) {
    logger.error('Unable to locate the requested resource');
    return res.status(404).json({error: {message: 'Unable to locate the requested resource', code: 'failedMiddlewareAlterationLookup'}});
  }

  req.alteration = result;
  return next();
});

// Handle requests for alterations
router.route('/alterations/:alteration([A-z0-9-]{36})')
  .get((req, res) => {
    return res.json(req.alteration);
  })
  .put(async (req, res) => {
    // Promoting from unknown to another state.
    if (req.alteration.alterationType === 'unknown' && req.body.alterationType !== 'unknown') {
      await db.models.genomicAlterationsIdentified.scope('public').create({
        pog_report_id: req.report.id,
        pog_id: req.POG.id,
        geneVariant: `${req.alteration.gene} (${req.alteration.variant})`,
      });
    }

    // Update DB Version for Entry
    try {
      const result = await db.models.alterations.update(req.body, {
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
        id, pog_id, pog_report_id, deletedAt, ...publicModel
      } = dataValues;

      return res.json(publicModel);
    } catch (error) {
      logger.error(`Unable to update the resource ${error}`);
      return res.status(500).json({error: {message: 'Unable to update the resource', code: 'failedAPCDestroy'}});
    }
  })
  .delete(async (req, res) => {
    // Soft delete the entry
    // Update result
    try {
      await db.models.alterations.destroy({where: {ident: req.alteration.ident}});
      return res.json({success: true});
    } catch (error) {
      logger.error(`Unable to remove resource ${error}`);
      return res.status(500).json({error: {message: 'Unable to remove resource', code: 'failedAPCremove'}});
    }
  });

// Routing for Alteration
router.route('/alterations/:type(therapeutic|biological|prognostic|diagnostic|unknown|novel|thisCancer|otherCancer)?')
  .get(async (req, res) => {
    // Setup where clause
    const where = {
      pog_report_id: req.report.id,
      reportType: 'genomic',
    };

    // Searching for specific type of alterations
    if (req.params.type) {
      // Are we looking for approved types?
      if (req.params.type.includes('Cancer')) {
        where.approvedTherapy = req.params.type;
      } else {
        where.alterationType = req.params.type;
        where.approvedTherapy = null;
      }
    } else {
      where.approvedTherapy = null;
      where.alterationType = {[Op.notIn]: ['unknown', 'novel']};
    }

    const options = {
      where,
      order: [['gene', 'ASC']],
    };

    try {
      // Get all rows for this POG
      const result = await db.models.alterations.scope('public').findAll(options);
      return res.json(result);
    } catch (error) {
      logger.error(`Unable to retrieve resource ${error}`);
      return res.status(500).json({error: {message: 'Unable to retrieve resource', code: 'failedAPClookup'}});
    }
  })

  .post(async (req, res) => {
    // Setup new data entry from vanilla
    req.body.pog_id = req.POG.id;
    req.body.pog_report_id = req.report.id;
    req.body.reportType = 'genomic';

    try {
      const result = await db.models.alterations.create(req.body);

      // Create new entry for Key Genomic Identified
      await db.models.genomicAlterationsIdentified.scope('public').create({
        pog_report_id: req.report.id,
        pog_id: req.POG.id,
        geneVariant: `${req.body.gene} (${req.body.variant})`,
      });

      return res.json(result);
    } catch (error) {
      logger.error(`Unable to update alterations ${error}`);
      return res.status(500).json({error: {message: 'Unable to update alterations', code: 'failedAPClookup'}});
    }
  });

router.param('gene', async (req, res, next, geneIdent) => {
  let result;
  try {
    result = await db.models.targetedGenes.scope('public').findOne({where: {ident: geneIdent}});
  } catch (error) {
    logger.error(`Unable to process request ${error}`);
    return res.status(500).json({error: {message: 'Unable to process the request', code: 'failedMiddlewareTargetedGeneQuery'}});
  }

  if (!result) {
    logger.error('Unable to locate the requested resource');
    return res.status(404).json({error: {message: 'Unable to locate the requested resource', code: 'failedMiddlewareTargetedGeneLookup'}});
  }

  req.alteration = result;
  return next();
});

// Handle requests for alterations
router.route('/targetedGenes/:gene([A-z0-9-]{36})')
  .get((req, res) => {
    return res.json(req.alteration);
  })
  .put(async (req, res) => {
    // Bump the version number for this entry
    req.body.ident = req.alteration.ident;
    req.body.pog_id = req.POG.id;
    req.body.pog_report_id = req.report.id;

    try {
      const result = await db.models.alterations.update(req.body, {
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
        id, pog_id, pog_report_id, deletedAt, ...publicModel
      } = dataValues;

      return res.json(publicModel);
    } catch (error) {
      logger.error(`Unable to update resource ${error}`);
      return res.status(500).json({error: {message: 'Unable to update resource', code: 'failedTargetedGenelookup'}});
    }
  })
  .delete(async (req, res) => {
    // Soft delete the entry
    // Update result
    try {
      await db.models.alterations.destroy({where: {ident: req.alteration.ident}});
      return res.json({success: true});
    } catch (error) {
      logger.error(`Unable to remove resource ${error}`);
      return res.status(500).json({error: {message: 'Unable to remove resource', code: 'failedTargetedGeneremove'}});
    }
  });

// Routing for Alteration
router.route('/targetedGenes')
  .get(async (req, res) => {
    // Setup where clause
    const where = {pog_report_id: req.report.id};

    const options = {
      where,
      order: [['gene', 'ASC']],
    };

    // Get all rows for this POG
    try {
      const result = await db.models.targetedGenes.scope('public').findAll(options);
      return res.json(result);
    } catch (error) {
      logger.error(`Unable to retrieve resource ${error}`);
      return res.status(500).json({error: {message: 'Unable to retrieve resource', code: 'failedTargetedGenelookup'}});
    }
  });

module.exports = router;
