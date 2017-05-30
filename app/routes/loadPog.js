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
router.route('/:type(genomic|probe)')
  .post((req,res,next) => {

    // Pog Options
    let pogOpts = { create: true };
    let profile;
    
    if(!req.body.project) return res.status(400).json({error: {message: "Project type is required in body.", code: "projectTypeNotSpecified"}});

    // Determine Loading Profile
    if(req.body.project === "POG") {
      pogOpts.nonPOG = false;
      if(req.params.type === 'genomic') profile = "pog_genomic";
      if(req.params.type === 'probe') profile = "pog_probe";
    }

    // Check if it's a nonPOG
    if(req.body.project !== 'POG') {
      pogOpts.nonPOG = true;
      profile = req.body.project + '_' + req.params.type;
    }

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

            // Set profile
            let loaderOptions = { profile: profile };

            if(req.body.baseDir) loaderOptions.baseDir = req.body.baseDir;

            // Check for supplied base directory

            let runLoader;

            // Genomic/Non-pog or Probe Report?
            if(loaderOptions.profile === 'pog_genomic') {
              let GenomicLoader = new require(process.cwd() + '/app/loaders');
              let Loader = new GenomicLoader(POG, report, loaderOptions);
              runLoader = Loader.load();
            }

            if(loaderOptions.profile === 'pog_probe') {

              let ProbeLoader = new require(process.cwd() + '/app/loaders/probing');
              let Loader = new ProbeLoader(POG, report, loaderOptions);
              runLoader = Loader.load();
            }

            if(req.body.project !== 'POG' && req.params.type === 'genomic') {

              // Non-POG options
              loaderOptions.nonPOG = true;
              loaderOptions.load = (loaderConf.defaults[req.body.profile] === undefined) ? loaderConf.defaults['default_genomic'].loaders :  loaderConf.defaults[req.body.profile].loaders;
              loaderOptions.baseDir = req.body.baseDir;
              loaderOptions.profile = 'nonPOG';
              loaderOptions.libraries = (loaderConf.defaults[req.body.profile] === undefined) ? {} : loaderConf.defaults[req.body.profile].libraries;
              loaderOptions.moduleOptions = (loaderConf.defaults[req.body.profile] === undefined) ? {} : loaderConf.defaults[req.body.profile].moduleOptions;

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

                db.models.analysis_report.scope('public').findOne({
                  where: { id: report.id },
                  include: [
                    {model: db.models.patientInformation, as: 'patientInformation', attributes: { exclude: ['id', 'deletedAt', 'pog_id'] } },
                    {model: db.models.tumourAnalysis.scope('public'), as: 'tumourAnalysis' },
                    {model: db.models.user.scope('public'), as: 'createdBy'},
                    {model: db.models.POG.scope('public'), as: 'pog' },
                    {model: db.models.pog_analysis.scope('public'), as: 'analysis'}
                  ]
                }).then(
                  (reports) => {
                    res.json(reports);
                  })
                  .catch((err) => {
                    console.log('Unable to lookup analysis reports', err);
                    res.status(500).json({error: {message: 'Unable to lookup analysis reports.'}});
                  });


              },
              (err) => {
                console.log('Loader Error', err);
                res.status(400).json({error: {message: 'Unable to load new POG report', code: 'loadersFailed', error: err}});
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
