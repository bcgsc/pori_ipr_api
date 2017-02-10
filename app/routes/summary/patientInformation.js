// app/routes/genomic/detailedGenomicAnalysis.js
let express = require('express'),
    router = express.Router({mergeParams: true}),
    db = require(process.cwd() + '/app/models'),
    logger = require(process.cwd() + '/app/libs/logger');

// Middleware for Patient Information
router.use('/', (req,res,next) => {
  
  // Get Patient Information for this POG
  db.models.patientInformation.findOne({ where: {pog_id: req.POG.id}, attributes: {exclude: ['id', 'deletedAt']}}).then(
    (result) => {

      // Not found
      if(result == null) res.status(404).json({error: {message: 'Unable to find the patient information for ' + req.POG.POGID + '.', code: 'failedPatientInformationLookup'}});
      
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
  
module.exports = router;
