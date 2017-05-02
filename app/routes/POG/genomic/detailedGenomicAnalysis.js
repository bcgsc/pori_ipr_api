"use strict";

// app/routes/genomic/detailedGenomicAnalysis.js
let express = require('express'),
    router = express.Router({mergeParams: true}),
    db = require(process.cwd() + '/app/models'),
    versionDatum = require(process.cwd() + '/app/libs/VersionDatum');

router.param('alteration', (req,res,next,altIdent) => {
   db.models.alterations.scope('public').findOne({ where: {ident: altIdent}}).then(
      (result) => {
        if(result === null) return res.status(404).json({error: {message: 'Unable to locate the requested resource.', code: 'failedMiddlewareAlterationLookup'} });
        
        req.alteration = result;
        next();
        
      },
      (error) => {
        console.log(error);
        return res.status(500).json({error: {message: 'Unable to process the request.', code: 'failedMiddlewareAlterationQuery'} });
      }
    );
});

// Handle requests for alterations
router.route('/alterations/:alteration([A-z0-9-]{36})')
  .get((req,res,next) => {
    res.json(req.alteration);
  })
  .put((req,res,next) => {

    // Promoting from unknown to another state.
    if(req.alteration.alterationType === 'unknown' && req.body.alterationType !== 'unknown') {
      db.models.genomicAlterationsIdentified.scope('public').create({
        pog_report_id: req.report.id,
        pog_id: req.POG.id,
        geneVariant: req.alteration.gene + ' (' + req.alteration.variant + ')'
      });
    }

    // Update DB Version for Entry
    versionDatum(db.models.alterations, req.alteration, req.body, req.user, req.body.comment).then(
      (resp) => {
        res.json(resp.data.create);
      },
      (error) => {
        console.log(error);
        res.status(500).json({error: {message: 'Unable to version the resource', code: 'failedAPCDestroy'} });
      }
    );
    
  })
  .delete((req,res,next) => {
    // Soft delete the entry
    // Update result
    db.models.alterations.destroy({ where: {ident: req.alteration.ident}}).then(
      (result) => {
        res.json({success: true});
      },
      (error) => {
        res.status(500).json({error: {message: 'Unable to remove resource', code: 'failedAPCremove'} });
      }
    );
      
          
  });

// Routing for Alteration
router.route('/alterations/:type(therapeutic|biological|prognostic|diagnostic|unknown|thisCancer|otherCancer)?')
  .get((req,res,next) => {
    
    // Setup where clause
    let where = {pog_report_id: req.report.id};
    where.reportType = 'genomic';
    
    // Searching for specific type of alterations
    if(req.params.type) {
      // Are we looking for approved types?
      if(req.params.type.indexOf('Cancer') !== -1) {
        where.approvedTherapy = req.params.type;
      } else {
        where.alterationType = req.params.type;
        where.approvedTherapy = null;
      } 
    } else {
      where.approvedTherapy = null;
      where.alterationType = {$ne: 'unknown'};
    }

    let options = {
      where: where,
      order: 'gene ASC',
    };
    
    // Get all rows for this POG
    db.models.alterations.scope('public').findAll(options).then(
      (result) => {
        res.json(result);
      },
      (error) => {
        console.log(error);
        res.status(500).json({error: {message: 'Unable to retrieve resource', code: 'failedAPClookup'} });
      }
    );
      
  })

  .post((req,res,next) => {
    // Setup new data entry from vanilla
    req.body.dataVersion = 0;
    req.body.pog_id = req.POG.id;
    req.body.pog_report_id= req.report.id;
    req.body.reportType = 'genomic';

    // Update result
    db.models.alterations.create(req.body).then(
      (result) => {
        // Send back newly created/updated result.
        res.json(result);

        // Create DataHistory entry
        let dh = {
          type: 'create',
          pog_id: result.pog_id,
          table: db.models.alterations.getTableName(),
          model: db.models.alterations.name,
          entry: result.ident,
          previous: null,
          new: 0,
          user_id: req.user.id,
          comment: req.body.comment
        };
        db.models.POGDataHistory.create(dh);

      },
      (error) => {
        console.log('SQL insert error', error);
        return res.status(500).json({error: {message: 'Unable to update resource', code: 'failedAPClookup'} });
      }
    );
    
  });


router.param('gene', (req,res,next,geneIdent) => {
  db.models.targetedGenes.scope('public').findOne({ where: {ident: geneIdent}}).then(
    (result) => {
      if(result === null) return res.status(404).json({error: {message: 'Unable to locate the requested resource.', code: 'failedMiddlewareTargetedGeneLookup'} });

      req.alteration = result;
      next();

    },
    (error) => {
      return res.status(500).json({error: {message: 'Unable to process the request.', code: 'failedMiddlewareTargetedGeneQuery'} });
    }
  );
});

// Handle requests for alterations
router.route('/targetedGenes/:gene([A-z0-9-]{36})')
  .get((req,res,next) => {

    res.json(req.alteration);

  })
  .put((req,res,next) => {

    // Bump the version number for this entry
    req.body.dataVersion = req.alteration.dataVersion + 1;
    req.body.ident = req.alteration.ident;
    req.body.pog_id = req.POG.id;
    req.body.pog_report_id = req.report.id;

    // Update result
    db.models.alterations.create(req.body).then(
      (result) => {
        // Send back newly created/updated result.
        res.json(result);
      },
      (error) => {
        return res.status(500).json({error: {message: 'Unable to update resource', code: 'failedTargetedGenelookup'} });
      }
    );


  })
  .delete((req,res,next) => {
    // Soft delete the entry
    // Update result
    db.models.alterations.destroy({ where: {ident: req.alteration.ident}}).then(
      (result) => {
        res.json({success: true});
      },
      (error) => {
        res.status(500).json({error: {message: 'Unable to remove resource', code: 'failedTargetedGeneremove'} });
      }
    );


  });

// Routing for Alteration
router.route('/targetedGenes')
  .get((req,res,next) => {

    // Setup where clause
    let where = {pog_report_id: req.report.id};

    let options = {
      where: where,
      order: 'gene ASC',
    };

    // Get all rows for this POG
    db.models.targetedGenes.scope('public').findAll(options).then(
      (result) => {
        res.json(result);
      },
      (error) => {
        console.log(error);
        res.status(500).json({error: {message: 'Unable to retrieve resource', code: 'failedTargetedGenelookup'} });
      }
    );

  });
  
module.exports = router;