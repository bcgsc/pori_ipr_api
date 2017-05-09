"use strict";

let express = require('express'),
    router = express.Router({mergeParams: true}),
    db = require(process.cwd() + '/app/models'),
    fileParse = require(process.cwd() + '/app/libs/parseCsvFile'),
    remapKeys = require(process.cwd() + '/app/libs/remapKeys'),
    pogLib = require(process.cwd() + '/app/libs/structures/pog'),
    reportLib = require(process.cwd() + '/app/libs/structures/analysis_report'),
    _ = require('lodash');

// Handle requests for loading POG into DB
router.route('/:type(genomic|probe)')
  .get((req,res,next) => {

    // Check valid report type to load
    if(['genomic','probe'].indexOf(req.params.type) < 0) return res.status(400).json({error: {message: 'Only genomic and probe are accepted report types to be loaded.', code: 'invalidReportTypeLoad'}});

    // First check if there's a POG entry..
    let POG = new pogLib(req.params.POGID);

    // Check if the POG has been created yet
    POG.retrieve({create:true})
      .then((POG) => {
        // Create Report
        let report = new reportLib();
        report.create(POG, req.user, req.params.type)
          .then((report) => {
            report.pog = POG;
            // All Good, time to run loader based on type
            let loader = (req.params.type === 'genomic') ? require(process.cwd() + '/app/loaders')(POG, report) : require(process.cwd() + '/app/loaders/probing')(POG, report);

            // Loader promise resolution
            loader.then(
              (result) => {
                res.json(report);
              },
              (err) => {
                res.status(500).json({error: {message: 'Unable to load new POG report', code: 'loadersFailed'}});
              }
            );

          })
          .catch((err) => {
            console.log('Failed to remove POG after loader failed', err);
            return res.status(error.status || 500).json({error: {message: 'Unable to load new POG data entries', code: 'reportCreateQueryFailed'}});
          });

      })
      .catch((err) => {
        console.log('Failed to remove POG after loader failed', err);
        return res.status(error.status || 500).json({error: {message: 'Unable to load new POG data entries', code: 'pogObjectQueryFailed'}});
      });

  })
  .delete((req,res,next) => {
    // Are we able to find this POG Report Entry?
    db.models.POG.findOne({ where: { POGID: req.params.POG} }).then(
      (pog) => {

        if(pog !== null) {
          // One was found, remove it!
          db.models.POG.destroy({ where: { POGID: req.params.POG} }).then(
            (result) => {
              // Successfully removed
              res.json({success: true});
            },
            (err) => {
              // Error
              res.status(500).json({error: {message: 'An internal error occured', code: 'pogFailedDestroy'}});
            }
          );
        }
        
        if(pog === null) {
          res.status(404).json({error: {message: 'Unable to find the requested resource', code: 'pogLookupFailed'}});
        }
      },
      (err) => {
        // Error
        res.status(500).json({error: {message: 'An internal error occured', code: 'pogFailedLookup'}});
      }
    );
    
    
  });
  
  
module.exports = router;
