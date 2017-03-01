"use strict";

// app/routes/genomic/detailedGenomicAnalysis.js
let express = require('express'),
  router = express.Router({mergeParams: true}),
  db = require(process.cwd() + '/app/models'),
  logger = require(process.cwd() + '/app/libs/logger'),
  multer = require('multer'),
  versionDatum = new require(process.cwd() + '/app/libs/VersionDatum');


// Middleware for Analyst Comments
router.use('/', (req,res,next) => {

  // Get Patient Information for this POG
  db.models.pathwayAnalysis.findOne({ where: {pog_id: req.POG.id}, order: '"dataVersion" DESC', attributes: {exclude: ['id', 'deletedAt']}}).then(
    (result) => {

      // Not found is allowed!
      // Found the patient information
      req.pathwayAnalysis = result;
      next();

    },
    (error) => {
      console.log('Unable to query pathway analysis', error);
      res.status(500).json({error: {message: 'Unable to lookup the pathway analysis for ' + req.POG.POGID + '.', code: 'failedPathwayAnaylsisQuery'}});
      res.end();
    }
  );
});


// Handle requests for alterations
router.route('/')
  .get((req,res,next) => {
    // Get Patient History
    res.json(req.pathwayAnalysis);

  })

  .put(multer({
    storage: multer.memoryStorage(),
  }).single("pathway"), (req,res,next) => {

    // Updating?
    if(!req.pathwayAnalysis) {

      // Create
      let request = {
        pathway: req.file.buffer.toString(),
        pog_id: req.POG.id,
        dataversion: 0
      };

      // Create entry
      db.models.pathwayAnalysis.create(request).then(
        (resp) => {
          res.json(resp);
        },
        (err) => {
          console.log('Unable to create Pathway Analysis entry', err);
        }
      );

    } else {
      // Updating
      let request = {
        pathway: req.file.buffer.toString(),
        pog_id: req.POG.id
      };

      // Remove current
      req.pathwayAnalysis.pog_id = req.POG.id;

      // Update DB Version for Entry
      versionDatum(db.models.pathwayAnalysis, req.pathwayAnalysis, request).then(
        (resp) => {
          res.json(resp.data.create);
        },
        (error) => {
          console.log(error);
          res.status(500).json({error: {message: 'Unable to version the resource', code: 'failedAnalystCommentVersion'}});
        }
      );
    }
  })

  .post((req,res,next) => {

  // Accept file upload
    multer({
      limits: {
        files: 1
      },
      onFileUploadComplete: (file) => {

        console.log('Recieved a file');
        console.log(file);

        // Is there an existing entry?
        if(req.pathwayAnalysis == null) {

          req.body.dataVersion = 0;
          req.body.pog_id = req.POG.id;
          req.body.pathway = file;

          // Create new entry
          db.models.pathwayAnalysis.create(req.body).then(
            (resp) => {
              res.json(resp);
            },
            (error) => {
              console.log(error);
              res.status(500).json({error: {message: 'Unable to version the resource', code: 'failedPathwayAnaylsisCreate'}});
            }
          );

        } else {
          //

        }
      }
    });
  });

module.exports = router;
