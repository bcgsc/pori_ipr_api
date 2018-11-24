const express = require('express');
const db = require('../../app/models');

const router = express.Router({mergeParams: true});

// Middleware for Patient Information
router.use('/', async (req, res, next) => {
  try {
    // Get Patient Information for this POG
    const patientInfo = await db.models.patientInformation.scope('public').findOne({where: {pog_id: req.POG.id}});

    if (!patientInfo) throw new Error('notFoundError'); // no patient info found

    // patient info found, set request param
    req.patientInformation = patientInfo;
    return next();
  } catch (err) {
    // set default return status and message
    let returnStatus = 500;
    let returnMessage = err.message;

    if (err.message === 'notFoundError') { // return 404 error - patient info could not be found
      returnStatus = 404;
      returnMessage = 'patient information could not be found';
    }

    return res.status(returnStatus).json({error: {message: `An error occurred while trying to find patient information for patient ${req.POG.POGID}: ${returnMessage}`}});
  }
});

// Handle requests for alterations
router.route('/')
  .get((req, res) => res.json(req.patientInformation))
  .put(async (req, res) => {
    try {
      const updatedPatientInfo = await db.models.patientInformation.update(req.body, {where: {pog_id: req.POG.id}, returning: true});
      return res.json(updatedPatientInfo[1][0]);
    } catch (err) {
      return res.status(500).json({error: {message: 'Unable to version the resource', code: 'failedPatientInformationVersion'}});
    }
  });

module.exports = router;
