// app/routes/genomic/detailedGenomicAnalysis.js
let express = require('express'),
    router = express.Router({mergeParams: true}),
    db = require(process.cwd() + '/app/models'),
    logger = require(process.cwd() + '/app/libs/logger'),
    versionDatum = new require(process.cwd() + '/app/libs/VersionDatum');

// Middleware for Tumour Analysis
router.use('/', (req,res,next) => {
  
  // Get Mutation Summary for this POG
  db.models.tumourAnalysis.scope('public').findOne({ where: {pog_report_id: req.report.id}}).then(
    (result) => {
      // Not found
      if(result == null) res.status(404).json({error: {message: 'Unable to find the tumour analysis for ' + req.POG.POGID + '.', code: 'failedTumourAnalysisLookup'}});
      
      // Found the patient information
      req.tumourAnalysis = result;
      next();
      
    },
    (error) => {
      res.status(500).json({error: {message: 'Unable to lookup the tumour analysis for ' + req.POG.POGID + '.', code: 'failedTumourAnalysisQuery'}});
      return new Error('Unable to query Tumour Analysis');
    }
  );
  
});

// Handle requests for Tumour Analysis
router.route('/')
  .get((req,res,next) => {
    // Get Patient History
    res.json(req.tumourAnalysis);
    
  })
  .put((req,res,next) => {

    // Update DB Version for Entry
    versionDatum(db.models.tumourAnalysis, req.tumourAnalysis, req.body, req.user, req.body.comment).then(
      (resp) => {
        res.json(resp.data.create);
      },
      (error) => {
        console.log(error);
        res.status(500).json({error: {message: 'Unable to version the resource', code: 'failedTumourAnalysisVersion'}});
      }
    );

  });
  
module.exports = router;
