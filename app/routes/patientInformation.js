const HTTP_STATUS = require('http-status-codes');
const express = require('express');
const db = require('../models');

const router = express.Router({mergeParams: true});
const logger = require('../log');

// Middleware for Patient Information
router.use('/', async (req, res, next) => {
  // Get Patient Information for this report
  let result;
  try {
    result = await db.models.patientInformation.scope('public').findOne({where: {reportId: req.report.id}});
  } catch (error) {
    logger.error(`Unable to query Patient Information for report ${req.report.ident} error: ${error}`);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: `Unable to lookup the patient information for report ${req.report.ident}`}});
  }

  if (!result) {
    logger.error(`Unable to find the patient information for report ${req.report.ident}`);
    return res.status(HTTP_STATUS.NOT_FOUND).json({error: {message: `Unable to find the patient information for report ${req.report.ident}`}});
  }

  // Found the patient information
  req.patientInformation = result;
  return next();
});

// Handle requests for alterations
router.route('/')
  .get((req, res) => {
    // Get Patient History
    return res.json(req.patientInformation);
  })
  .put(async (req, res) => {
    try {
      const result = await db.models.patientInformation.update(req.body, {
        where: {reportId: req.report.id},
        individualHooks: true,
        paranoid: true,
        returning: true,
      });

      // Get updated model data from update
      const [, [{dataValues}]] = result;

      // Remove id's and deletedAt properties from returned model
      const {
        id, reportId, deletedAt, ...publicModel
      } = dataValues;

      return res.json(publicModel);
    } catch (error) {
      logger.error(`Unable to update patient information ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to update patient information', code: 'failedPatientInformationVersion'}});
    }
  });

module.exports = router;
