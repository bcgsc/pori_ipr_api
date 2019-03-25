// app/routes/genomic/somaticMutation.js
const express = require('express');

const router = express.Router({mergeParams: true});
const db = require(`${process.cwd()}/app/models`);
const versionDatum = require(`${process.cwd()}/app/libs/VersionDatum`);

router.param('mutation', async (req, res, next, mutIdent) => {
  try {
    const result = await db.models.somaticMutations.scope('public').findOne({where: {ident: mutIdent}});
    if (result === null) return res.status(404).json({error: {message: 'Unable to locate the requested resource.', code: 'failedMiddlewareSomaticMutationLookup'}});

    req.mutation = result;
    return next();
  } catch (error) {
    return res.status(500).json({error: {message: 'Unable to process the request.', code: 'failedMiddlewareSomaticMutationQuery'}});
  }
});

// Handle requests for alterations
router.route('/smallMutations/:mutation([A-z0-9-]{36})')
  .get((req, res) => {
    res.json(req.mutation);
  })
  .put(async (req, res) => {
    try {
      // Update DB Version for Entry
      const result = await versionDatum(db.models.somaticMutations, req.mutation, req.body, req.user);
      res.json(result.data.create);
    } catch (error) {
      console.log(error);
      res.status(500).json({error: {message: 'Unable to version the resource', code: 'failedOutlierVersion'}});
    }
  })
  .delete(async (req, res) => {
    try {
      // Soft delete the entry
      // Update result
      await db.models.somaticMutations.destroy({where: {ident: req.mutation.ident}});
      res.json({success: true});
    } catch (error) {
      res.status(500).json({error: {message: 'Unable to remove resource', code: 'failedSomaticMutationremove'}});
    }
  });

// Routing for Alteration
router.route('/smallMutations/:type(clinical|nostic|biological|unknown)?')
  .get(async (req, res) => {
    // Setup where clause
    const where = {pog_report_id: req.report.id};

    // Searching for specific type of alterations
    if (req.params.type) {
      // Are we looking for approved types?
      where.mutationType = req.params.type;
    }

    const options = {
      where,
      order: [['gene', 'ASC']],
    };

    try {
      // Get all rows for this POG
      const result = await db.models.smallMutations.scope('public').findAll(options);
      res.json(result);
    } catch (error) {
      console.log(error);
      res.status(500).json({error: {message: 'Unable to retrieve resource', code: 'failedSomaticMutationlookup'}});
    }
  });

// Routing for Alteration
router.route('/mutationSignature')
  .get(async (req, res) => {
    const options = {
      where: {pog_report_id: req.report.id},
      order: [['signature', 'ASC']],
    };

    try {
      // Get all rows for this POG
      const result = await db.models.mutationSignature.scope('public').findAll(options);
      res.json(result);
    } catch (error) {
      console.log(error);
      res.status(500).json({error: {message: 'Unable to retrieve resource', code: 'failedMutationSignaturelookup'}});
    }
  });


module.exports = router;
