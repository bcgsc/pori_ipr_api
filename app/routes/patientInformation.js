const express = require('express');
const db = require('../models');

const router = express.Router({mergeParams: true});
const {logger} = process;

// Middleware for Patient Information
router.use('/', async (req, res, next) => {
  // Get Patient Information for this POG
  try {
    const result = await db.models.patientInformation.scope('public').findOne({where: {pog_id: req.POG.id}});

    if (!result) {
      return res.status(404).json({error: {message: `Unable to find the patient information for ${req.POG.POGID}.`, code: 'failedPatientInformationLookup'}});
    }
    // Found the patient information
    req.patientInformation = result;
    return next();
  } catch (error) {
    logger.error(`Unable to query Patient Information ${error}`);
    return res.status(500).json({error: {message: `Unable to lookup the patient information for ${req.POG.POGID}.`, code: 'failedPatientInformationQuery'}});
  }
});

// Handle requests for alterations
router.route('/')
  .get((req, res) => {
    // Get Patient History
    return res.json(req.patientInformation);
  })
  .put(async (req, res) => {
    try {
      await db.models.patientInformation.update(req.body, {where: {pog_id: req.POG.id}});
      const result = await db.models.patientInformation.findOne({where: {pog_id: req.POG.id}});
      return res.json(result);
    } catch (error) {
      logger.error(error);
      return res.status(500).json({error: {message: 'Unable to version the resource', code: 'failedPatientInformationVersion'}});
    }
  });

module.exports = router;
