// app/routes/genomic/somaticMutation.js
let express = require('express'),
  router = express.Router({mergeParams: true}),
  db = require(process.cwd() + '/app/models'),
  versionDatum = require(process.cwd() + '/app/libs/VersionDatum');

router.param('mutation', (req,res,next,mutIdent) => {
  db.models.somaticMutations.scope('public').findOne({ where: {ident: mutIdent}}).then(
    (result) => {
      if(result === null) return res.status(404).json({error: {message: 'Unable to locate the requested resource.', code: 'failedMiddlewareSomaticMutationLookup'} });

      req.mutation = result;
      next();

    },
    (error) => {
      return res.status(500).json({error: {message: 'Unable to process the request.', code: 'failedMiddlewareSomaticMutationQuery'} });
    }
  );
});

// Handle requests for alterations
router.route('/smallMutations/:mutation([A-z0-9-]{36})')
  .get((req,res,next) => {

    res.json(req.mutation);

  })
  .put((req,res,next) => {

    // Update DB Version for Entry
    versionDatum(db.models.somaticMutations, req.mutation, req.body, req.user).then(
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
    db.models.somaticMutations.destroy({ where: {ident: req.mutation.ident}}).then(
      (result) => {
        res.json({success: true});
      },
      (error) => {
        res.status(500).json({error: {message: 'Unable to remove resource', code: 'failedSomaticMutationremove'} });
      }
    );


  });

// Routing for Alteration
router.route('/smallMutations/:type(clinical|nostic|biological|unknown)?')
  .get((req,res,next) => {

    // Setup where clause
    let where = {pog_report_id: req.report.id};

    // Searching for specific type of alterations
    if(req.params.type) {
      // Are we looking for approved types?
      where.mutationType = req.params.type;
    }

    let options = {
      where: where,
      order: [['gene', 'ASC']],
    };

    // Get all rows for this POG
    db.models.smallMutations.scope('public').findAll(options).then(
      (result) => {
        res.json(result);
      },
      (error) => {
        console.log(error);
        res.status(500).json({error: {message: 'Unable to retrieve resource', code: 'failedSomaticMutationlookup'} });
      }
    );

  });

// Routing for Alteration
router.route('/mutationSignature')
  .get((req,res,next) => {

    let options = {
      where: {pog_report_id: req.report.id},
      order: [['signature', 'ASC']],
    };

    // Get all rows for this POG
    db.models.mutationSignature.scope('public').findAll(options).then(
      (result) => {
        res.json(result);
      },
      (error) => {
        console.log(error);
        res.status(500).json({error: {message: 'Unable to retrieve resource', code: 'failedMutationSignaturelookup'} });
      }
    );

  });


module.exports = router;