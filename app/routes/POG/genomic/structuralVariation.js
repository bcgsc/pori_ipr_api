const express = require('express');

const router = express.Router({mergeParams: true});
const db = require('../../../models');

const logger = require('../../../log');

router.param('sv', async (req, res, next, svIdent) => {
  let result;
  try {
    result = await db.models.sv.scope('public').findOne({where: {ident: svIdent}});
  } catch (error) {
    logger.error(`Unable to get structural variant ${error}`);
    return res.status(500).json({error: {message: 'Unable to get structural variant', code: 'failedMiddlewareStructuralVariationQuery'}});
  }

  if (!result) {
    logger.error('Unable to locate structural variant');
    return res.status(404).json({error: {message: 'Unable to locate structural variant', code: 'failedMiddlewareStructuralVariationLookup'}});
  }
  req.variation = result;
  return next();
});

// Handle requests for alterations
router.route('/sv/:sv([A-z0-9-]{36})')
  .get((req, res) => {
    return res.json(req.variation);
  })
  .put(async (req, res) => {
    // Update DB Version for Entry
    try {
      const result = await db.models.sv.update(req.body, {
        where: {
          ident: req.variation.ident,
        },
        individualHooks: true,
        paranoid: true,
      });

      // Get updated model data from update
      const [, [{dataValues}]] = result;

      // Remove id's and deletedAt properties from returned model
      const {
        id, pog_id, report_id, deletedAt, ...publicModel
      } = dataValues;

      return res.json(publicModel);
    } catch (error) {
      logger.error(`Unable to update structural variant ${error}`);
      return res.status(500).json({error: {message: 'Unable to update structural variant', code: 'failedOutlierVersion'}});
    }
  })
  .delete(async (req, res) => {
    // Soft delete the entry
    // Update result
    try {
      await db.models.sv.destroy({where: {ident: req.sv.ident}});
      return res.json({success: true});
    } catch (error) {
      logger.error(`Unable to remove structural variant ${error}`);
      return res.status(500).json({error: {message: 'Unable to remove structural variant', code: 'failedStructuralVariationremove'}});
    }
  });

// Routing for Alteration
router.route('/sv/:type(clinical|nostic|biological|fusionOmicSupport|uncharacterized)?')
  .get(async (req, res) => {
    // Setup where clause
    const where = {report_id: req.report.id};

    // Searching for specific type of alterations
    if (req.params.type) {
      // Are we looking for approved types?
      where.svVariant = req.params.type;
    }

    const options = {
      where,
    };

    // Get all rows for this POG
    try {
      const results = await db.models.sv.scope('public').findAll(options);
      return res.json(results);
    } catch (error) {
      logger.error(`Unable to retrieve structural variants ${error}`);
      return res.status(500).json({error: {message: 'Unable to retrieve structural variants', code: 'failedStructuralVariationlookup'}});
    }
  });


module.exports = router;
