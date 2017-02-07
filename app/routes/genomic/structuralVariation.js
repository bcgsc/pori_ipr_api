// app/routes/genomic/somaticMutation.js
let express = require('express'),
  router = express.Router({mergeParams: true}),
  db = require(process.cwd() + '/app/models');

router.param('sv', (req,res,next,svtIdent) => {
  db.models.sv.findOne({ where: {ident: svIdent}, attributes: {exclude: ['id', 'deletedAt']}, order: 'dataVersion DESC'}).then(
    (result) => {
      if(result == null) return res.status(404).json({error: {message: 'Unable to locate the requested resource.', code: 'failedMiddlewareStructuralVariationLookup'} });

      req.alteration = result;
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

    res.json(req.alteration);

  })
  .put((req,res,next) => {

    // Bump the version number for this entry
    req.body.dataVersion = req.alteration.dataVersion + 1;
    req.body.ident = req.sv.ident;
    req.body.pog_id = req.POG.id;

    // Update result
    db.models.sv.create(req.body).then(
      (result) => {
        // Send back newly created/updated result.
        res.json(result);
      },
      (error) => {
        return res.status(500).json({error: {message: 'Unable to update resource', code: 'failedStructuralVariationlookup'} });
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
router.route('/sv/:type(clinical|nostic|biological|fusionOmicSupport)?')
  .get((req,res,next) => {

    // Setup where clause
    let where = {pog_id: req.POG.id}

    // Searching for specific type of alterations
    if(req.params.type) {
      // Are we looking for approved types?
      where.svVariant = req.params.type;
    }

    console.log('Where clause', where);

    let options = {
      where: where,
      attributes: {
        exclude: ['id', 'deletedAt']
      },
      order: 'dataVersion DESC',
      order: 'genes ASC',
      group: 'ident'
    }

    // Get all rows for this POG
    db.models.sv.findAll(options).then(
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