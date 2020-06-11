const HTTP_STATUS = require('http-status-codes');
const express = require('express');

const router = express.Router({mergeParams: true});
const db = require('../../../models');

const logger = require('../../../log');

// Middleware for Analyst Comments
router.use('/', async (req, res, next) => {
  // Get Patient Information for report
  // Not found is allowed!
  try {
    req.analystComments = await db.models.analystComments.scope('public').findOne({where: {reportId: req.report.id}});
    return next();
  } catch (error) {
    logger.error(`Unable to query analyst comments for ${req.report.patientId} with error ${error}`);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: `Unable to query analyst comments for ${req.report.patientId}`}});
  }
});

// Handle requests for analyst comments
router.route('/')
  .get((req, res) => {
    return res.json(req.analystComments);
  })
  .put(async (req, res) => {
    // First Comments
    if (!req.analystComments) {
      req.body.reportId = req.report.id;

      // Create new entry
      try {
        await db.models.analystComments.create(req.body);
      } catch (error) {
        logger.error(`Unable to create new analysis comments ${error}`);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to create new analysis comments'}});
      }
    } else {
      // Update DB Version for Entry
      try {
        await db.models.analystComments.update(req.body, {
          where: {
            ident: req.analystComments.ident,
          },
          individualHooks: true,
          paranoid: true,
        });
      } catch (error) {
        logger.error(`Unable to update analysis comments ${error}`);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to update analysis comments'}});
      }
    }

    // get updated public view of record with includes
    // TODO: This will get replaced with a save + reload
    // this should be changed in DEVSU-1049
    try {
      const updatedResult = await db.models.analystComments.scope('public').findOne({where: {reportId: req.report.id}});
      return res.json(updatedResult);
    } catch (error) {
      logger.error(`Unable to get updated analysis comments ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to get updated analysis comments'}});
    }
  })
  .delete(async (req, res) => {
    if (!req.analystComments) {
      logger.error('Unable to find analysis comments to delete');
      return res.status(HTTP_STATUS.NOT_FOUND).json({error: {message: 'Unable to find analysis comments to delete'}});
    }

    try {
      await db.models.analystComments.destroy({where: {ident: req.analystComments.ident}});
      return res.status(HTTP_STATUS.NO_CONTENT).send();
    } catch (error) {
      logger.error(`Unable to delete analysis comments ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to delete analysis comments'}});
    }
  });

module.exports = router;
