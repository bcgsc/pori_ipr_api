// app/routes/genomic/detailedGenomicAnalysis.js
let express = require('express'),
    router = express.Router({mergeParams: true}),
    db = require(process.cwd() + '/app/models'),
    logger = require(process.cwd() + '/app/libs/logger');

// Middleware for Tumour Analysis
router.use('/', (req,res,next) => {
  
  // Get Mutation Summary for this POG
  db.models.tumourAnalysis.findOne({ where: {pog_id: req.POG.id}, order: 'dataVersion DESC', attributes: {exclude: ['id', 'deletedAt', 'pog_id']}}).then(
    (result) => {
      // Not found
      if(result == null) res.status(404).json({error: {message: 'Unable to find the tumour analysis for ' + req.POG.POGID + '.', code: 'failedTumourAnalysisLookup'}});
      
      // Found the patient information
      req.tumourAnalysis = result;
      next();
      
    },
    (error) => {
      return new Error('Unable to query Tumour Analysis');
      res.status(500).json({error: {message: 'Unable to lookup the tumour analysis for ' + req.POG.POGID + '.', code: 'failedTumourAnalysisQuery'}});
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
    // Bump the version number for this entry
    req.body.dataVersion = req.tumourAnalysis.dataVersion + 1;
    req.body.ident = req.tumourAnalysis.ident;
    req.body.pog_id = req.POG.id;
    
    // Update result
    db.models.tumourAnalysis.create(req.body).then(
      (result) => {
        // Send back newly created/updated result.
        res.json(result);
      },
      (error) => {
        return res.status(500).json({error: {message: 'Unable to update resource', code: 'failedTumourAnalysisUpdate'} });
      }
    );
    
  });
  
module.exports = router;
