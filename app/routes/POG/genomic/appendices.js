// app/routes/genomic/somaticMutation.js
let express = require('express'),
  router = express.Router({mergeParams: true}),
  db = require(process.cwd() + '/app/models'),
  tcga_v8 = require(process.cwd() + '/database/exp_matrix.v8.json');
  tcga_v9 = require(process.cwd() + '/database/exp_matrix.v9.json');

// Handle requests for alterations
router.route('/tcga')
  .get((req,res,next) => {
    
    console.log('Using set', req.report.expression_matrix);
  
    if(req.report.expression_matrix === 'v8') return res.json(tcga_v8);
    if(req.report.expression_matrix === 'v9') return res.json(tcga_v9);
    
    res.json([]);

  });

module.exports = router;