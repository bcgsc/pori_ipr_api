// app/routes/genomic/somaticMutation.js
let express = require('express'),
  router = express.Router({mergeParams: true}),
  db = require(process.cwd() + '/app/models'),
  versionDatum = require(process.cwd() + '/app/libs/VersionDatum');

router.param('sv', (req,res,next,svtIdent) => {
  db.models.sv.scope('public').findOne({ where: {ident: svIdent}}).then(
    (result) => {
      if(result === null) return res.status(404).json({error: {message: 'Unable to locate the requested resource.', code: 'failedMiddlewareStructuralVariationLookup'} });
      req.variation = result;
      next();
    },
    (error) => {
      return res.status(500).json({error: {message: 'Unable to process the request.', code: 'failedMiddlewareStructuralVariationQuery'} });
    }
  );
});

// Handle requests for alterations
router.route('/sv/:sv([A-z0-9-]{36})')
  .get((req,res,next) => {

    res.json(req.variation);

  })
  .put((req,res,next) => {

    // Update DB Version for Entry
    versionDatum(db.models.sv, req.variation, req.body, req.user).then(
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
    // Update result
    db.models.sv.destroy({ where: {ident: req.sv.ident}}).then(
      (result) => {
        res.json({success: true});
      },
      (error) => {
        res.status(500).json({error: {message: 'Unable to remove resource', code: 'failedStructuralVariationremove'} });
      }
    );


  });

// Routing for Alteration
router.route('/sv/:type(clinical|nostic|biological|fusionOmicSupport|uncharacterized)?')
  .get((req,res,next) => {

    // Setup where clause
    let where = {pog_report_id: req.report.id};

    // Searching for specific type of alterations
    if(req.params.type) {
      // Are we looking for approved types?
      where.svVariant = req.params.type;
    }

    let options = {
      where: where,
    };

    // Get all rows for this POG
    db.models.sv.scope('public').findAll(options).then(
      (result) => {
        res.json(result);
      },
      (error) => {
        console.log(error);
        res.status(500).json({error: {message: 'Unable to retrieve resource', code: 'failedStructuralVariationlookup'} });
      }
    );

  });


module.exports = router;