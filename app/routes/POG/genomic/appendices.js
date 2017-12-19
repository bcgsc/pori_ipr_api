// app/routes/genomic/somaticMutation.js
let express = require('express'),
  router = express.Router({mergeParams: true}),
  db = require(process.cwd() + '/app/models'),
  tcga = require(process.cwd() + '/database/exp_matrix.v8.json');

// Handle requests for alterations
router.route('/tcga')
  .get((req,res,next) => {

    res.json(tcga);

  });

module.exports = router;