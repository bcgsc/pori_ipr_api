// app/routes/genomic/detailedGenomicAnalysis.js
let express = require('express'),
    router = express.Router({mergeParams: true}),
    db = require(process.cwd() + '/app/models'),
    logger = require(process.cwd() + '/app/libs/logger'),
    versionDatum = new require(process.cwd() + '/app/libs/VersionDatum');

// Middleware for Patient Information
router.use('/', (req,res,next) => {
  
  // Get Patient Information for this POG
  db.models.patientInformation.scope('public').findOne({ where: {pog_id: req.POG.id}}).then(
    (result) => {

      // Not found
      if(result === null) res.status(404).json({error: {message: 'Unable to find the patient information for ' + req.POG.POGID + '.', code: 'failedPatientInformationLookup'}});
      
      // Found the patient information
      req.patientInformation = result;
      next();
      
    },
    (error) => {
      new Error('Unable to query Patient Information');
      res.status(500).json({error: {message: 'Unable to lookup the patient information for ' + req.POG.POGID + '.', code: 'failedPatientInformationQuery'}});
    }
  );
  
});

// Handle requests for alterations
router.route('/')
  .get((req,res,next) => {
    // Get Patient History
    res.json(req.patientInformation);
    
  })
  .put((req,res,next) => {

    /**
     *
     * !!!!
     * Bypass versioning for temporary patient information storage
     * !!!!
     *
     */

    db.models.patientInformation.update(req.body, {where: {pog_id: req.POG.id}}).then(
      (resp) => {

        db.models.patientInformation.findOne({where: {pog_id: req.POG.id}}).then(
          (resp) => {
            res.json(resp);
          }
        );

      },
      (error) => {
        console.log(error);
        res.status(500).json({error: {message: 'Unable to version the resource', code: 'failedPatientInformationVersion'}});
      }
    );


  });
  
module.exports = router;
