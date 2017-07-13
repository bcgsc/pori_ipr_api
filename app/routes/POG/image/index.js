// app/routes/genomic/detailedGenomicAnalysis.js
let express = require('express'),
    _ = require('lodash'),
    router = express.Router({mergeParams: true}),
    db = require(process.cwd() + '/app/models'),
    loader = require(process.cwd() + '/app/loaders/detailedGenomicAnalysis/alterations');
  

// Register middleware

// Route for getting an image
router.route('/retrieve/:key')
  .get((req,res,next) => {

    let keys = [];
    // Get All Pogs
    if(req.params.key.indexOf(',') === -1) keys.push(req.params.key);
    if(req.params.key.indexOf(',') > -1) {
      keys = req.params.key.split(',');
    }

    let opts = {
      where: {
        key: {
          in: keys
        },
        pog_report_id: req.report.id,
      },
      attributes: {exclude: ['id','deletedAt', 'pog_id', 'pog_report_id']},
    };

    db.models.imageData.findAll(opts).then(
      (result) => {
        output = {};

        _.forEach(result, (v,k) => {

          output[v.key] = v;

        });

        res.json(output);
      },
      (error) => {
        res.status(500).json({error: {message: "Unable to query image data", code: "imageQueryFailed"}});
      }
    );
    
    })
    .put((req,res,next) => {
    // Add a new Potential Clinical Alteration...
  });
router.route('/expressionDensityGraphs')
  .get((req,res,next) => {

    db.models.imageData.findAll({
      where: {
        pog_id: req.POG.id,
        key: {
          $like: 'expDensity.%'
        }
      },
      order: 'key ASC',
      attributes: {exclude: ['id','deletedAt', 'pog_id']}
    }).then(
      (result) => {
        output = {};

        _.forEach(result, (v,k) => {

          output[v.key] = v;

        });

        res.json(output);
      },
      (error) => {
        res.status(500).json({error: {message: "Unable to query image data", code: "imageQueryFailed"}});
      }
    )

  });

module.exports = router;
