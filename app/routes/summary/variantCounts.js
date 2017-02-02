// app/routes/summary/variantCounts.js
let express = require('express'),
    router = express.Router({mergeParams: true}),
    db = require(process.cwd() + '/app/models'),
    logger = require(process.cwd() + '/app/libs/logger');

// Middleware for Variant Counts
router.use('/', (req,res,next) => {
  
  // Get Mutation Summary for this POG
  db.models.variantCounts.findOne({ where: {pog_id: req.POG.id}, order: 'dataVersion DESC', attributes: {exclude: ['id', 'deletedAt', 'pog_id']}}).then(
    (result) => {
      // Not found
      if(result == null) res.status(404).json({error: {message: 'Unable to find the variant counts for ' + req.POG.POGID + '.', code: 'failedVariantCountsLookup'}});
      
      // Found the patient information
      req.variantCounts = result;
      next();
      
    },
    (error) => {
      return new Error('Unable to query Variant Counts');
      res.status(500).json({error: {message: 'Unable to lookup the variant counts for ' + req.POG.POGID + '.', code: 'failedVariantCountsQuery'}});
    }
  );
  
});

// Handle requests for Variant Counts
router.route('/')
  .get((req,res,next) => {
    // Get Patient History
    res.json(req.variantCounts);
    
  })
  .put((req,res,next) => {
    // Bump the version number for this entry
    req.body.dataVersion = req.variantCounts.dataVersion + 1;
    req.body.ident = req.variantCounts.ident;
    req.body.pog_id = req.POG.id;
    
    // Update result
    db.models.variantCounts.create(req.body).then(
      (result) => {
        // Send back newly created/updated result.
        res.json(result);
      },
      (error) => {
        return res.status(500).json({error: {message: 'Unable to update resource', code: 'failedVariantCountsUpdate'} });
      }
    );
    
  });
  
module.exports = router;
