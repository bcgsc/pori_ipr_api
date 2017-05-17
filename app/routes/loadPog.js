"use strict";

let express = require('express'),
    router = express.Router({mergeParams: true}),
    db = require(process.cwd() + '/app/models'),
    fileParse = require(process.cwd() + '/app/libs/parseCsvFile'),
    remapKeys = require(process.cwd() + '/app/libs/remapKeys'),
    pogLib = require(process.cwd() + '/app/libs/structures/pog'),
    reportLib = require(process.cwd() + '/app/libs/structures/analysis_report'),
    nconf = require('nconf').file(process.cwd() + '/config/'+process.env.NODE_ENV+'.json'),
    _ = require('lodash');

let loaderConf = nconf.get('loader');

// Handle requests for loading POG into DB
router.route('/:type(genomic|probe|nonPOG)')
  .post((req,res,next) => {

    // Pog Options
    let pogOpts = { create: true};

    // Check if it's a nonPOG
    if(req.params.type === 'nonPOG') {
      pogOpts.nonPOG = true;
      pogOpts.create = true;
    }

    // V

    // First check if there's a POG entry..
    let POG = new pogLib(req.params.POGID);

    // Check if the POG has been created yet
    POG.retrieve(pogOpts)
      .then((POG) => {
        // Create Report
        let report = new reportLib();
        let createPogOpts = {};

        report.create(POG, req.user, (req.params.type !== 'genomic' && req.params.type !== 'probe') ? 'genomic' : req.params.type)
          .then((report) => {

            // Set POG to report
            report.pog = POG;

            let loaderOptions = {};

            // Check for nonPOG
            if(req.params.type === 'nonPOG') {

            }

            // POG Genomic
            if(req.params.type === 'genomic') {
              loaderOptions.profile = 'pogGenomic';
            }

            let runLoader;

            // Genomic/Non-pog or Probe Report?
            if(req.params.type === 'genomic' || loaderOptions.reportType === 'genomic') {
              let GenomicLoader = new require(process.cwd() + '/app/loaders');
              let Loader = new GenomicLoader(POG, report, loaderOptions);
              runLoader = Loader.load();
            }

            if(req.params.type === 'probe') {
              runLoader = require(process.cwd() + '/app/loaders/probing')(POG, report);
            }

            if(req.params.type === 'nonPOG') {
              // Non-POG options
              loaderOptions.nonPOG = true;
              loaderOptions.load = loaderConf.defaults[req.body.profile].loaders;
              loaderOptions.baseDir = req.body.baseDir;
              loaderOptions.profile = 'nonPOG';
              loaderOptions.libraries = loaderConf.defaults[req.body.profile].libraries;
              loaderOptions.moduleOptions = loaderConf.defaults[req.body.profile].moduleOptions;

              let GenomicLoader = new require(process.cwd() + '/app/loaders');
              let Loader = new GenomicLoader(POG, report, loaderOptions);
              runLoader = Loader.load();
            }

            if(runLoader === null) {
              res.status(500).json({error: {message: 'Unable to invoke loading mechanism'}});
              throw new Error('No Loaders Running');
            }

            // Loader promise resolution
            runLoader.then(
              (result) => {
                res.json(report);
              },
              (err) => {
                console.log('Loader Error', err);
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
