// app/routes/loadPog.js
let express = require('express'),
    router = express.Router({mergeParams: true}),
    db = require(process.cwd() + '/app/models'),
    fileParse = require(process.cwd() + '/app/libs/parseCsvFile'),
    remapKeys = require(process.cwd() + '/app/libs/remapKeys'),
    _ = require('lodash');

// Handle requests for loading POG into DB
router.route('/')
  .get((req,res,next) => {
  
    console.log('Loading POG..');
  
    // First created the POG entry in the primary DB
    db.models.POG.findOne({ where: { POGID: req.params.POG} }).then(
      (pog) => {
        // Check if already exists
        if(pog !== null) return res.status(400).json({error: {message: 'This POG has already been loaded', code: 'pogAlreadyLoaded'}});
        
        // Start the onboarding process
        db.models.POG.create({ POGID: req.params.POG }).then(
          (POG) => {
            // Lets load in some data from sources!
            
            // Loaders
            require(process.cwd() + '/app/loaders')(POG).then(
              (result) => {
                // Loaded!
                res.json(POG);
              },
              (error) => {
                // Failed
                db.models.POG.destroy({ where: {id: POG.id}}).then(
                  (response) => {
                    return res.status(error.status || 500).json({error: {message: 'Unable to load new POG data entries', code: 'pogLoadersStopped'}});
                  },
                  (err) => {
                    console.log('Failed to remove POG after loader failed', err);
                    return res.status(error.status || 500).json({error: {message: 'Unable to load new POG data entries', code: 'pogDestroyQueryFailed'}});
                  }
                );
              }
            );
            
          },
          (error) => {
            // Unable to create POG
            res.status(500).json({error: {message: 'Unable to create the new pog entry', code: 'pogCreateFailed'}});
          }
        );
        
      },
      (err) => {
        // Unable to search for POGs
        res.status(500).json({error: {message: 'Unable to check for existing POGs', code: 'pogLookupFailed'}});
      }
    );
    
    
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
