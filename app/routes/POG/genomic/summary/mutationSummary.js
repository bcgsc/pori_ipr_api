// app/routes/genomic/detailedGenomicAnalysis.js
let express = require('express'),
    router = express.Router({mergeParams: true}),
    db = require(process.cwd() + '/app/models'),
    logger = require(process.cwd() + '/app/libs/logger'),
  versionDatum = new require(process.cwd() + '/app/libs/VersionDatum');

// Middleware for Mutation Summary
router.use('/', (req,res,next) => {
  
  // Get Mutation Summary for this POG
  db.models.mutationSummary.scope('public').findOne({ where: {pog_report_id: req.report.id}}).then(
    (result) => {
      // Not found
      if(result === null) return res.status(404).json({error: {message: 'Unable to find the mutation summary for ' + req.POG.POGID + '.', code: 'failedMutationSummaryLookup'}});
      
      // Found the patient information
      req.mutationSummary = result;
      next();
      
    },
    (error) => {
      res.status(500).json({error: {message: 'Unable to lookup the Mutation Summary for ' + req.POG.POGID + '.', code: 'failedMutationSummaryQuery'}});
      return new Error('Unable to query Mutation Summary');
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

    // Update DB Version for Entry
    versionDatum(db.models.mutationSummary, req.mutationSummary, req.body, req.user, req.body.comment).then(
      (resp) => {
        res.json(resp.data.create);
      },
      (error) => {
        console.log(error);
        res.status(500).json({error: {message: 'Unable to version the resource', code: 'failedMutationSummaryVersion'}});
      }
    );

  });
  
module.exports = router;
