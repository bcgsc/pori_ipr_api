const express = require('express');
const {Op} = require('sequelize');
const db = require('../../../models');
const logger = require('../../../../lib/log');

const router = express.Router({mergeParams: true});

router.param('alteration', async (req, res, next, altIdent) => {
  let result;
  try {
    result = await db.models.alterations.scope('public').findOne({where: {ident: altIdent}});
  } catch (error) {
    logger.error(`Unable to find alteration ${error}`);
    return res.status(500).json({error: {message: 'Unable to find alteration', code: 'failedMiddlewareAlterationQuery'}});
  }

  if (!result) {
    logger.error('Unable to locate alteration');
    return res.status(404).json({error: {message: 'Unable to locate alteration', code: 'failedMiddlewareAlterationLookup'}});
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
        id, pog_id, pog_report_id, deletedAt, ...publicModel
      } = dataValues;

      return res.json(publicModel);
    } catch (error) {
      logger.error(`Unable to update genomic alterations ${error}`);
      return res.status(500).json({error: {message: 'Unable to update genomic alterations', code: 'failedAPCDestroy'}});
    }
  })
  .delete(async (req, res) => {
    // Soft delete the entry
    // Update result
    try {
      await db.models.alterations.destroy({where: {ident: req.alteration.ident}});
      return res.json({success: true});
    } catch (error) {
      logger.error(`Unable to remove alterations ${error}`);
      return res.status(500).json({error: {message: 'Unable to remove alterations', code: 'failedAPCremove'}});
    }
  });

// Routing for Alteration
router.route('/:type(therapeutic|biological|prognostic|diagnostic|unknown|thisCancer|otherCancer)?')
  .get(async (req, res) => {
    // Setup where clause
    const where = {
      pog_report_id: req.report.id,
      reportType: 'probe',
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
      where.alterationType = {[Op.ne]: 'unknown'};
    }

    const options = {
      where,
      order: [['gene', 'ASC']],
    };

    // Get all rows for this POG
    try {
      const results = await db.models.alterations.scope('public').findAll(options);
      return res.json(results);
    } catch (error) {
      logger.error(`Unable to retrieve alterations ${error}`);
      return res.status(500).json({error: {message: 'Unable to retrieve alterations', code: 'failedAPClookup'}});
    }
  })
  .post(async (req, res) => {
    // Setup new data entry from vanilla
    req.body.pog_id = req.POG.id;
    req.body.pog_report_id = req.report.id;

    try {
      const result = await db.models.alterations.create(req.body);
      return res.json(result);
    } catch (error) {
      logger.error(`Unable to create alterations ${error}`);
      return res.status(500).json({error: {message: 'Unable to create alterations', code: 'failedAPClookup'}});
    }
  });

module.exports = router;
