// app/routes/genomic/detailedGenomicAnalysis.js
let express = require('express'),
    router = express.Router({mergeParams: true}),
    db = require(process.cwd() + '/app/models'),
    logger = require(process.cwd() + '/app/libs/logger');

// Middleware for Analyst Comments
router.use('/', (req,res,next) => {
  
  // Get Patient Information for this POG
  db.models.analystComments.findOne({ where: {pog_id: req.POG.id}, order: 'dataVersion DESC', attributes: {exclude: ['id', 'deletedAt', 'pog_id']}}).then(
    (result) => {
    
      // Not found is allowed!
      // Found the patient information
      req.analystComments = result;
      next();
      
    },
    (error) => {
      new Error('Unable to query Analyst Comments', error);
      res.status(500).json({error: {message: 'Unable to lookup the analyst comments for ' + req.POG.POGID + '.', code: 'failedAnalystCommentsQuery'}});
      res.end();
    }
  );
  
});

// Handle requests for alterations
router.route('/')
  .get((req,res,next) => {
    // Get Patient History
    res.json(req.analystComments);
    
  })
  .put((req,res,next) => {
  
    // Updating Comments
    if(req.analystComments !== null) {
      // Bump the version number for this entry
      req.body.dataVersion = req.analystComments.dataVersion + 1;
      req.body.ident = req.analystComments.ident;
      req.body.pog_id = req.POG.id;
    }
    // First Comments
    if(req.analystComments == null) {
      req.body.pog_id = req.POG.id;
    }
    
    // Update result
    db.models.analystComments.create(req.body).then(
      (result) => {
        // Send back newly created/updated result.
        res.json(result);
      },
      (error) => {
        return res.status(500).json({error: {message: 'Unable to update resource', code: 'failedAnalystCommentsUpdate'} });
      }
    );
    
  });
  
module.exports = router;
