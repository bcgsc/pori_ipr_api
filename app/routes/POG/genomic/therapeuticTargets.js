const express = require('express');

const router = express.Router({mergeParams: true});
const db = require('../../../models');
const logger = require('../../../log');

router.param('target', async (req, res, next, target) => {
  let result;
  try {
    result = await db.models.therapeuticTarget.scope('public').findOne({where: {ident: target}});
  } catch (error) {
    logger.error(`Unable to find therapeutic target ${error}`);
    return res.status(500).json({error: {message: 'Unable to find therapeutic target', code: 'failedMiddlewareTherapeuticTargetQuery'}});
  }

  if (!result) {
    logger.error('Unable to locate therapeutic target');
    return res.status(404).json({error: {message: 'Unable to locate therapeutic target', code: 'failedMiddlewareTherapeuticTargetLookup'}});
  }

  req.target = result;
  return next();
});

// Handle requests for alterations
router.route('/:target([A-z0-9-]{36})')
  .get((req, res) => {
    return res.json(req.target);
  })
  .put(async (req, res) => {
    req.body.ident = req.target.ident;

    // Update DB Version for Entry
    try {
      const result = await db.models.therapeuticTarget.update(req.body, {
        where: {
          ident: req.target.ident,
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
      logger.error(`Unable to update therapeutic target ${error}`);
      return res.status(500).json({error: {message: 'Unable to update therapeutic target', code: 'failedTherapeuticTargetVersion'}});
    }
  })
  .delete(async (req, res) => {
    // Soft delete the entry
    // Update result
    try {
      await db.models.therapeuticTarget.destroy({where: {ident: req.target.ident}});

      return res.json({success: true});
    } catch (error) {
      logger.error(`Unable to remove therapeutic target ${error}`);
      return res.status(500).json({error: {message: 'Unable to remove therapeutic target', code: 'failedTherapeuticTargetRemove'}});
    }
  });

// Routing for Alteration
router.route('/')
  .get(async (req, res) => {
    // Setup where clause
    const where = {report_id: req.report.id};
    const options = {
      where,
      order: [['rank', 'ASC']],
    };

    // Get all rows for this POG
    try {
      const results = await db.models.therapeuticTarget.scope('public').findAll(options);
      return res.json(results);
    } catch (error) {
      logger.error(`Unable to retrieve therapeutic targets ${error}`);
      return res.status(500).json({error: {message: 'Unable to retrieve therapeutic targets', code: 'failedTherapeuticTargetlookup'}});
    }
  })
  .post(async (req, res) => {
    // Create new entry
    req.body.pog_id = req.POG.id;
    req.body.report_id = req.report.id;

    try {
      const result = await db.models.therapeuticTarget.create(req.body);
      return res.json(result);
    } catch (error) {
      logger.error(`Unable to create new therapeutic target entry ${error}`);
      return res.status(500).json({error: {message: 'Unable to create new therapeutic target entry', code: 'failedTherapeuticTargetCreate'}});
    }
  });

module.exports = router;
