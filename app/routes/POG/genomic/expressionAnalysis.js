// app/routes/genomic/somaticMutation.js
let express = require('express'),
  router = express.Router({mergeParams: true}),
  db = require(process.cwd() + '/app/models'),
  versionDatum = require(process.cwd() + '/app/libs/VersionDatum');


/*
 * Outliers
 *
 */
router.param('outlier', (req,res,next,oIdent) => {
  db.models.outlier.scope('public').findOne({ where: {ident: oIdent, expType: {$in: ['rna', 'protein']}}}).then(
    (result) => {
      if(result === null) return res.status(404).json({error: {message: 'Unable to locate the requested resource.', code: 'failedMiddlewareOutlierLookup'} });

      req.outlier = result;
      next();

    },
    (error) => {
      return res.status(500).json({error: {message: 'Unable to process the request.', code: 'failedMiddlewareOutlierQuery'} });
    }
  );
});

// Handle requests for outliers
router.route('/outlier/:outlier([A-z0-9-]{36})')
  .get((req,res,next) => {

    res.json(req.outlier);

  })
  .put((req,res,next) => {


    // Update DB Version for Entry
    versionDatum(db.models.outlier, req.outlier, req.body, req.user).then(
      (resp) => {
        res.json(resp.data.create);
      },
      (error) => {
        console.log(error);
        res.status(500).json({error: {message: 'Unable to version the resource', code: 'failedOutlierVersion'}});
      }
    );

  })
  .delete((req,res,next) => {
    // Soft delete the entry
    db.models.outlier.destroy({ where: {ident: req.outlier.ident}}).then(
      (result) => {
        res.json({success: true});
      },
      (error) => {
        res.status(500).json({error: {message: 'Unable to remove resource', code: 'failedOutlierRemove'} });
      }
    );


  });

// Routing for all Outliers
router.route('/outlier/:type(clinical|nostic|biological)?')
  .get((req,res,next) => {

    // Setup where clause
    let where = {pog_report_id: req.report.id, expType: {$in: ['rna', 'protein']}};

    // Searching for specific type of outlier
    if(req.params.type) {
      // Are we looking for approved types?
      where.outlierType = req.params.type;
    }

    let options = {
      where: where
    };

    // Get all rows for this POG
    db.models.outlier.scope('public').findAll(options).then(
      (result) => {
        res.json(result);
      },
      (error) => {
        console.log(error);
        res.status(500).json({error: {message: 'Unable to retrieve resource', code: 'failedOutlierlookup'} });
      }
    );

  });

/*
 * Drug Targets
 *
 */
router.param('drugTarget', (req,res,next,oIdent) => {
  db.models.drugTarget.scope('public').findOne({ where: {ident: oIdent}}).then(
    (result) => {
      if(result === null) return res.status(404).json({error: {message: 'Unable to locate the requested resource.', code: 'failedMiddlewareOutlierLookup'} });

      req.drugTarget = result;
      next();

    },
    (error) => {
      return res.status(500).json({error: {message: 'Unable to process the request.', code: 'failedMiddlewareOutlierQuery'} });
    }
  );
});

// Handle requests for drugTarget
router.route('/drugTarget/:drugTarget([A-z0-9-]{36})')
  .get((req,res,next) => {

    res.json(req.drugTarget);

  })
  .put((req,res,next) => {

    // Update DB Version for Entry
    versionDatum(db.models.drugTarget, req.drugTarget, req.body, req.user).then(
      (resp) => {
        res.json(resp.data.create);
      },
      (error) => {
        console.log(error);
        res.status(500).json({error: {message: 'Unable to version the resource', code: 'failedMutationSummaryVersion'}});
      }
    );

  })
  .delete((req,res,next) => {
    // Soft delete the entry
    db.models.drugTarget.destroy({ where: {ident: req.drugTarget.ident}}).then(
      (result) => {
        res.json({success: true});
      },
      (error) => {
        res.status(500).json({error: {message: 'Unable to remove resource', code: 'failedOutlierRemove'} });
      }
    );


  });

// Routing for Alteration
router.route('/drugTarget')
  .get((req,res,next) => {

    let options = {
      where: {pog_report_id: req.report.id},
      order: 'gene ASC'
    };

    // Get all rows for this POG
    db.models.drugTarget.scope('public').findAll(options).then(
      (result) => {
        res.json(result);
      },
      (error) => {
        console.log(error);
        res.status(500).json({error: {message: 'Unable to retrieve resource', code: 'failedOutlierlookup'} });
      }
    );

  });

/** Protein Expression **/


router.param('protein', (req,res,next,oIdent) => {
  db.models.outlier.scope('public').findOne({ where: {ident: oIdent, expType: 'protein'}}).then(
    (result) => {
      if(result === null) return res.status(404).json({error: {message: 'Unable to locate the requested resource.', code: 'failedMiddlewareProteinLookup'} });
      
      req.outlier = result;
      next();
      
    },
    (error) => {
      return res.status(500).json({error: {message: 'Unable to process the request.', code: 'failedMiddlewareProteinQuery'} });
    }
  );
});

// Handle requests for outliers
router.route('/protein/:protein([A-z0-9-]{36})')
  .get((req,res,next) => {
    
    res.json(req.protein);
    
  })
  .put((req,res,next) => {
    
    
    // Update DB Version for Entry
    versionDatum(db.models.outlier, req.outlier, req.body, req.user).then(
      (resp) => {
        res.json(resp.data.create);
      },
      (error) => {
        console.log(error);
        res.status(500).json({error: {message: 'Unable to version the resource', code: 'failedProteinVersion'}});
      }
    );
    
  })
  .delete((req,res,next) => {
    // Soft delete the entry
    db.models.outlier.destroy({ where: {ident: req.outlier.ident}}).then(
      (result) => {
        res.json({success: true});
      },
      (error) => {
        res.status(500).json({error: {message: 'Unable to remove resource', code: 'failedProteinRemove'} });
      }
    );
    
    
  });

// Routing for all Outliers
router.route('/protein/:type(clinical|nostic|biological)?')
  .get((req,res,next) => {
    
    // Setup where clause
    let where = {pog_report_id: req.report.id, expType: 'protein'};
    
    // Searching for specific type of outlier
    if(req.params.type) {
      // Are we looking for approved types?
      where.proteinType = req.params.type;
    }
    
    let options = {
      where: where
    };
    
    // Get all rows for this POG
    db.models.outlier.scope('public').findAll(options).then(
      (result) => {
        res.json(result);
      },
      (error) => {
        console.log(error);
        res.status(500).json({error: {message: 'Unable to retrieve resource', code: 'failedProteinlookup'} });
      }
    );
    
  });



module.exports = router;