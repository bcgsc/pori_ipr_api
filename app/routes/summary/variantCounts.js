// app/routes/summary/variantCounts.js
let express = require('express'),
    router = express.Router({mergeParams: true}),
    db = require(process.cwd() + '/app/models'),
    logger = require(process.cwd() + '/app/libs/logger'),
  versionDatum = new require(process.cwd() + '/app/libs/VersionDatum');

// Middleware for Variant Counts
router.use('/', (req,res,next) => {
  
  // Get Mutation Summary for this POG
  db.models.variantCounts.findOne({ where: {pog_id: req.POG.id}, attributes: {exclude: ['id', '"deletedAt"']}}).then(
    (result) => {
      // Not found
      if(result == null) res.status(404).json({error: {message: 'Unable to find the variant counts for ' + req.POG.POGID + '.', code: 'failedVariantCountsLookup'}});
      
      // Found the patient information
      req.variantCounts = result;
      next();
      
    },
    (error) => {
      res.status(500).json({error: {message: 'Unable to lookup the variant counts for ' + req.POG.POGID + '.', code: 'failedVariantCountsQuery'}});
      return new Error('Unable to query Variant Counts');
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

    // Update DB Version for Entry
    versionDatum(db.models.variantCounts, req.variantCounts, req.body).then(
      (resp) => {
        res.json(resp.data.create);
      },
      (error) => {
        console.log(error);
        res.status(500).json({error: {message: 'Unable to version the resource', code: 'failedVariantCountsVersion'}});
      }
    );
    
  });
  
module.exports = router;
