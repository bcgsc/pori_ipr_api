// app/routes/genomic/somaticMutation.js
let express = require('express'),
  router = express.Router({mergeParams: true}),
  db = require(process.cwd() + '/app/models'),
  versionDatum = require(process.cwd() + '/app/libs/VersionDatum');

router.param('cnv', (req,res,next,mutIdent) => {
  db.models.cnv.findOne({ where: {ident: mutIdent}, attributes: {exclude: ['id', 'deletedAt']}}).then(
    (result) => {
      if(result == null) return res.status(404).json({error: {message: 'Unable to locate the requested resource.', code: 'failedMiddlewareCNVLookup'} });

      req.cnv = result;
      next();

    },
    (error) => {
      return res.status(500).json({error: {message: 'Unable to process the request.', code: 'failedMiddlewareCNVQuery'} });
    }
  );
});

// Handle requests for alterations
router.route('/cnv/:cnv([A-z0-9-]{36})')
  .get((req,res,next) => {

    res.json(req.cnv);

  })
  .put((req,res,next) => {

    // Update DB Version for Entry
    versionDatum(db.models.cnv, req.cnv, req.body).then(
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
    db.models.cnv.destroy({ where: {ident: req.cnv.ident}}).then(
      (result) => {
        res.json({success: true});
      },
      (error) => {
        res.status(500).json({error: {message: 'Unable to remove resource', code: 'failedCNVremove'} });
      }
    );


  });

// Routing for Alteration
router.route('/cnv/:type(clinical|nostic|biological|commonAmplified|homodTumourSupress|highlyExpOncoGain|lowlyExpTSloss)?')
  .get((req,res,next) => {

    // Setup where clause
    let where = {pog_id: req.POG.id}

    // Searching for specific type of alterations
    if(req.params.type) {
      // Are we looking for approved types?
      where.cnvVariant = req.params.type;
    }

    let options = {
      where: where,
      attributes: {
        exclude: ['id', 'deletedAt']
      },
      order: '"dataVersion" DESC, gene ASC',
    }

    // Get all rows for this POG
    db.models.cnv.findAll(options).then(
      (result) => {
        res.json(result);
      },
      (error) => {
        console.log(error);
        res.status(500).json({error: {message: 'Unable to retrieve resource', code: 'failedCNVlookup'} });
      }
    );

  });


module.exports = router;