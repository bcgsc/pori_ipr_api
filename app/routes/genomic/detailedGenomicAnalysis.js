// app/routes/genomic/detailedGenomicAnalysis.js
let express = require('express'),
    router = express.Router({mergeParams: true}),
    db = require(process.cwd() + '/app/models'),
    versionDatum = require(process.cwd() + '/app/libs/VersionDatum');

router.param('alteration', (req,res,next,altIdent) => {
   db.models.alterations.findOne({ where: {ident: altIdent}, attributes: {exclude: ['id', 'deletedAt']}}).then(
      (result) => {
        if(result == null) return res.status(404).json({error: {message: 'Unable to locate the requested resource.', code: 'failedMiddlewareAlterationLookup'} });
        
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

    // Update DB Version for Entry
    versionDatum(db.models.alterations, req.alteration, req.body).then(
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
    let where = {pog_id: req.POG.id}
    
    // Searching for specific type of alterations
    if(req.params.type) {
      // Are we looking for approved types?
      if(req.params.type.indexOf('Cancer') !== -1) {
        where.approvedTherapy = req.params.type;
      } else {
        where.alterationType = req.params.type;
      } 
    } else {
      where.approvedTherapy = null;
      where.alterationType = {$ne: 'unknown'};
    }
    
    console.log('Where clause', where);
    
    let options = {
      where: where, 
      attributes: {
        exclude: ['id', '"deletedAt"']
      },
      order: 'gene ASC',
    }
    
    // Get all rows for this POG
    db.models.alterations.findAll(options).then(
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
    
    // Update result
    db.models.alterations.create(req.body).then(
      (result) => {
        // Send back newly created/updated result.
        res.json(result);
      },
      (error) => {
        return res.status(500).json({error: {message: 'Unable to update resource', code: 'failedAPClookup'} });
      }
    );
    
  });


router.param('gene', (req,res,next,altIdent) => {
  db.models.targetedGenes.findOne({ where: {ident: altIdent}, attributes: {exclude: ['id', 'deletedAt']}, order: 'dataVersion DESC'}).then(
    (result) => {
      if(result == null) return res.status(404).json({error: {message: 'Unable to locate the requested resource.', code: 'failedMiddlewareTargetedGeneLookup'} });

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
    let where = {pog_id: req.POG.id}

    let options = {
      where: where,
      attributes: {
        exclude: ['id', 'deletedAt']
      },
      order: 'gene ASC',
    }

    // Get all rows for this POG
    db.models.targetedGenes.findAll(options).then(
      (result) => {
        res.json(result);
      },
      (error) => {
        console.log(error);
        res.status(500).json({error: {message: 'Unable to retrieve resource', code: 'failedTargetedGenelookup'} });
      }
    );

  })
  
module.exports = router;