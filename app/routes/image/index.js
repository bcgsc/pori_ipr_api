// app/routes/genomic/detailedGenomicAnalysis.js
let express = require('express'),
    router = express.Router({mergeParams: true}),
    db = require(process.cwd() + '/app/models'),
    loader = require(process.cwd() + '/app/loaders/detailedGenomicAnalysis/alterations');
  

// Register middleware  
router.param('POG', require(process.cwd() + '/app/middleware/pog'));

// Route for getting an image
router.route('/:key')
  .get((req,res,next) => {
    // Get All Pogs
    
    db.models.imageData.findOne({ where: { key: req.params.key } }).then(
      (result) => {
        
        let image = new Buffer(result.data).toString('base64')
      
        res.json({img: 'data:image/png;base64,'+image});
      },
      (error) => {
        res.status(500).json({error: {message: "Unable to query image data", code: "imageQueryFailed"}});
      }
    );
    
    })
    .put((req,res,next) => {
    // Add a new Potential Clinical Alteration...
  });
  

module.exports = router;
