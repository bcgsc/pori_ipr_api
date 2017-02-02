// app/routes/genomic/detailedGenomicAnalysis.js
let express = require('express'),
    router = express.Router({mergeParams: true}),
    db = require(process.cwd() + '/app/models'),
    logger = require(process.cwd() + '/app/libs/logger');

// Middleware for Mutation Summary
router.use('/', (req,res,next) => {
  
  // Get Mutation Summary for this POG
  db.models.mutationSummary.findOne({ where: {pog_id: req.POG.id}, order: 'dataVersion DESC', attributes: {exclude: ['id', 'deletedAt', 'pog_id']}}).then(
    (result) => {
      // Not found
      if(result == null) res.status(404).json({error: {message: 'Unable to find the mutation summary for ' + req.POG.POGID + '.', code: 'failedMutationSummaryLookup'}});
      
      // Found the patient information
      req.mutationSummary = result;
      next();
      
    },
    (error) => {
      return new Error('Unable to query Mutation Summary');
      res.status(500).json({error: {message: 'Unable to lookup the Mutation Summary for ' + req.POG.POGID + '.', code: 'failedMutationSummaryQuery'}});
    }
  );
  
});

// Handle requests for mutation summary
router.route('/')
  .get((req,res,next) => {
    // Get Patient History
    res.json(req.mutationSummary);
    
  })
  .put((req,res,next) => {
    // Bump the version number for this entry
    req.body.dataVersion = req.mutationSummary.dataVersion + 1;
    req.body.ident = req.mutationSummary.ident;
    req.body.pog_id = req.POG.id;
    
    // Update result
    db.models.mutationSummary.create(req.body).then(
      (result) => {
        // Send back newly created/updated result.
        res.json(result);
      },
      (error) => {
        return res.status(500).json({error: {message: 'Unable to update resource', code: 'failedMutationSummaryUpdate'} });
      }
    );
    
  });
  
module.exports = router;
