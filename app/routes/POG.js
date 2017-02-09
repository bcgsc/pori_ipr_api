// app/routes/genomic/detailedGenomicAnalysis.js
let express = require('express'),
    router = express.Router({mergeParams: true}),
    db = require(process.cwd() + '/app/models'),
    _ = require('lodash'),
    loader = require(process.cwd() + '/app/loaders/detailedGenomicAnalysis/alterations');
  

// Register middleware  
router.param('POG', require(process.cwd() + '/app/middleware/pog'));

// Route for getting a POG
router.route('/')
  .get((req,res,next) => {
    // Get All Pogs
    db.models.POG.findAll({
        attributes: {exclude: ['id','deletedAt']},
        include: [
          {model: db.models.patientInformation, as: 'patientInformation', attributes: { exclude: ['id', 'deletedAt', 'pog_id'] }, order: 'dataVersion DESC', group: 'ident' },
          {model: db.models.tumourAnalysis, as: 'tumourAnalysis', attributes: { exclude: ['id', 'deletedAt', 'pog_id'] }, order: 'dataVersion DESC', group: 'ident' },
        ],
        group: 'POG.ident',
        order: 'POG.POGID ASC'
      }).then(
        (pogs) => {
          _.forEach(pogs, (pog,k) => {
            pogs[k].seqQC = JSON.parse(pog.seqQC);
            pogs[k].sampleInfo = JSON.parse(pog.sampleInfo);
          });
          res.json(pogs);
        },
        (error) => {
          console.log(error);
          res.status(500).json({error: {message: "Unable to retrieve the requested resources", code: "failedAllPogsQuery"}});
        }
      );
    })
    .put((req,res,next) => {
    // Add a new Potential Clinical Alteration...
  });
  
router.route('/:POG')
  .get((req,res,next) => {
    // Return requested POG
    res.json({
      ident: req.POG.ident, 
      POGID: req.POG.POGID, 
      createdAt: req.POG.createdAt, 
      updatedAt: req.POG.updatedAt, 
      patientInformation: req.POG.patientInformation, 
      tumourAnalysis: req.POG.tumourAnalysis,
      seqQC: JSON.parse(req.POG.seqQC),
      sampleInfo: JSON.parse(req.POG.sampleInfo),
      config: req.POG.config
    });
  });

module.exports = router;
