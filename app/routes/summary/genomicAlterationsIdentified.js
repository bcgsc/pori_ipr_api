"use strict";

// app/routes/genomic/detailedGenomicAnalysis.js
let express = require('express'),
    router = express.Router({mergeParams: true}),
    db = require(process.cwd() + '/app/models'),
    _ = require('lodash'),
    versionDatum = new require(process.cwd() + '/app/libs/VersionDatum');

router.param('alteration', (req,res,next,altIdent) => {
   db.models.genomicAlterationsIdentified.findOne({ where: {ident: altIdent}, attributes: {exclude: ['id', '"deletedAt"']}}).then(
      (result) => {
        if(result == null) return res.status(404).json({error: {message: 'Unable to locate the requested resource.', code: 'failedMiddlewareAlterationLookup'} });
        
        req.alteration = result;
        next();
        
      },
      (error) => {
        return res.status(500).json({error: {message: 'Unable to process the request.', code: 'failedMiddlewareAlterationQuery'} });
      }
    );
});

// Handle requests for alterations
router.route('/:alteration([A-z0-9-]{36})')
  .get((req,res,next) => {
    
    res.json(req.alteration);
    
  })
  .put((req,res,next) => {

    // Update DB Version for Entry
    versionDatum(db.models.genomicAlterationsIdentified, req.alteration, req.body, req.user).then(
      (resp) => {
        res.json(resp.data.create);
      },
      (error) => {
        console.log(error);
        res.status(500).json({error: {message: 'Unable to version the resource', code: 'failedAPClookup'} });
      }
    );

    
  })
  .delete((req,res,next) => {
    // Soft delete the entry
    // Update result
    db.models.genomicAlterationsIdentified.destroy({ where: {ident: req.alteration.ident}}).then(
      (result) => {

        // Is there a query message?
        if(req.query.cascade && req.query.cascade === 'true') {

          // Check to see if we're propagating this down into Detailed Genomic
          let gene = _.split(req.alteration.geneVariant, (/\s/));
          let where = { gene: gene[0], variant: gene[1].replace(/(\(|\))/g, ''), pog_id: req.POG.id };

          // Cascade removal of variant through Detailed Genomic Analysis
          db.models.alterations.destroy({where: where}).then(
            (resp) => {
              res.status(204).json();
            },
            (err) => {
              res.status(500).json({status: true, message: 'Unable to cascade removal into Detailed Genomic Analysis.'});
            }
          );

        } else {
          res.status(204).send();
        }
      },
      (error) => {
        res.status(500).json({error: {message: 'Unable to remove resource', code: 'failedGenomicAlterationsIdentifiedRemove'} });
      }
    );
      
          
  });

// Routing for Alteration
router.route('/')
  .get((req,res,next) => {
    
    let options = {
      where: {
        pog_id: req.POG.id
      },
      attributes: {
        exclude: ['id', '"deletedAt"', 'pog_id']
      },
    }
    
    // Get all rows for this POG
    db.models.genomicAlterationsIdentified.findAll(options).then(
      (result) => {
        res.json(result);
      },
      (error) => {
        console.log(error);
        res.status(500).json({error: {message: 'Unable to retrieve resource', code: 'failedGenomicAlterationsIdentifiedQuery'} });
      }
    );
      
  })
  .post((req,res,next) => {
    // Add a new Potential Clinical Alteration...
  });
  
module.exports = router;
