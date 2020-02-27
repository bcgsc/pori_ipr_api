const HTTP_STATUS = require('http-status-codes');
const express = require('express');

const router = express.Router({mergeParams: true});
const db = require('../../models');
const logger = require('../../log');

// Fetch the therapeutic target if found as URL param
router.param('target', async (req, res, next, target) => {
  let result;
  try {
    result = await db.models.therapeuticTarget.scope('public').findOne({where: {ident: target}});
  } catch (error) {
    logger.error(`Unable to find therapeutic target ${error}`);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to find therapeutic target', code: 'failedMiddlewareTherapeuticTargetQuery'}});
  }

  if (!result) {
    logger.error('Unable to locate therapeutic target');
    return res.status(HTTP_STATUS.NOT_FOUND).json({error: {message: 'Unable to locate therapeutic target', code: 'failedMiddlewareTherapeuticTargetLookup'}});
  }

  req.target = result;
  return next();
});

// Handle requests for alterations
router.route('/:target([A-z0-9-]{36})')
  .get((req, res) => {
    // Get a specific Target by ID
    const {target} = req;
    return res.json(target);
  })
  .put(async (req, res) => {
    const {target: {ident}, body} = req;

    // update the record with the new content
    try {
      const [, [{dataValues}]] = await db.models.therapeuticTarget.update(
        {...body, ident},
        {
          where: {
            ident,
          },
          individualHooks: true,
          paranoid: true,
          returning: true,
        }
      );

      // Remove id's and deletedAt properties from returned model
      const {
        id, reportId, deletedAt, ...publicModel
      } = dataValues;

      return res.json(publicModel);
    } catch (error) {
      logger.error(`Unable to update therapeutic target ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to update therapeutic target', code: 'failedTherapeuticTargetVersion'}});
    }
  })
  .delete(async (req, res) => {
    const {target: {ident}} = req;
    // Soft delete the entry
    // Update result
    try {
      await db.models.therapeuticTarget.destroy({where: {ident}});

      return res.json({success: true});
    } catch (error) {
      logger.error(`Unable to remove therapeutic target ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to remove therapeutic target', code: 'failedTherapeuticTargetRemove'}});
    }
  });

// Routing for Alteration
router.route('/')
  .get(async (req, res) => {
    const {report: {id: reportId}} = req;

    // Get all rows for this report
    try {
      const results = await db.models.therapeuticTarget.scope('public').findAll({
        where: {reportId},
        order: [['rank', 'ASC']],
      });
      return res.json(results);
    } catch (error) {
      logger.error(`Unable to retrieve therapeutic targets ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to retrieve therapeutic targets', code: 'failedTherapeuticTargetlookup'}});
    }
  })
  .post(async (req, res) => {
    // Create new entry
    const {report: {id: reportId}, body} = req;

    try {
      const result = await db.models.therapeuticTarget.create({
        ...body,
        reportId,
      });
      return res.status(HTTP_STATUS.CREATED).json(result);
    } catch (error) {
      logger.error(`Unable to create new therapeutic target entry ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to create new therapeutic target entry', code: 'failedTherapeuticTargetCreate'}});
    }
  });

module.exports = router;
