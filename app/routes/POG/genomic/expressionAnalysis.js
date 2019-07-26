// app/routes/genomic/somaticMutation.js
const express = require('express');
const {Op} = require('sequelize');

const router = express.Router({mergeParams: true});
const db = require(`${process.cwd()}/app/models`);
const versionDatum = require(`${process.cwd()}/app/libs/VersionDatum`);


/*
 * Outliers
 *
 */
router.param('outlier', async (req, res, next, oIdent) => {
  try {
    const result = await db.models.outlier.scope('public').findOne({where: {ident: oIdent, expType: {[Op.in]: ['rna', 'protein']}}});
    if (result === null) return res.status(404).json({error: {message: 'Unable to locate the requested resource.', code: 'failedMiddlewareOutlierLookup'}});

    req.outlier = result;
    return next();
  } catch (error) {
    console.log(error);
    return res.status(500).json({error: {message: 'Unable to process the request.', code: 'failedMiddlewareOutlierQuery'}});
  }
});

// Handle requests for outliers
router.route('/outlier/:outlier([A-z0-9-]{36})')
  .get((req, res) => {
    res.json(req.outlier);
  })
  .put(async (req, res) => {
    try {
      // Update DB Version for Entry
      const result = await versionDatum(db.models.outlier, req.outlier, req.body, req.user);
      res.json(result.data.create);
    } catch (error) {
      console.log(error);
      res.status(500).json({error: {message: 'Unable to version the resource', code: 'failedOutlierVersion'}});
    }
  })
  .delete(async (req, res) => {
    try {
      // Soft delete the entry
      await db.models.outlier.destroy({where: {ident: req.outlier.ident}});
      res.json({success: true});
    } catch (error) {
      console.log(error);
      res.status(500).json({error: {message: 'Unable to remove resource', code: 'failedOutlierRemove'}});
    }
  });

// Routing for all Outliers
router.route('/outlier/:type(clinical|nostic|biological)?')
  .get(async (req, res) => {
    // Setup where clause
    const where = {pog_report_id: req.report.id, expType: {[Op.in]: ['rna', 'protein']}};
    // Searching for specific type of outlier
    if (req.params.type) {
      // Are we looking for approved types?
      where.outlierType = req.params.type;
    }

    const options = {
      where,
    };

    try {
      const result = await db.models.outlier.scope('public').findAll(options);
      res.json(result);
    } catch (error) {
      console.log(error);
      res.status(500).json({error: {message: 'Unable to retrieve resource', code: 'failedOutlierlookup'}});
    }
  });

/*
 * Drug Targets
 *
 */
router.param('drugTarget', async (req, res, next, oIdent) => {
  try {
    const result = await db.models.drugTarget.scope('public').findOne({where: {ident: oIdent}});
    if (result === null) return res.status(404).json({error: {message: 'Unable to locate the requested resource.', code: 'failedMiddlewareOutlierLookup'}});

    req.drugTarget = result;
    return next();
  } catch (error) {
    console.log(error);
    return res.status(500).json({error: {message: 'Unable to process the request.', code: 'failedMiddlewareOutlierQuery'}});
  }
});

// Handle requests for drugTarget
router.route('/drugTarget/:drugTarget([A-z0-9-]{36})')
  .get((req, res) => {
    res.json(req.drugTarget);
  })
  .put(async (req, res) => {
    try {
      // Update DB Version for Entry
      const result = await versionDatum(db.models.drugTarget, req.drugTarget, req.body, req.user);
      res.json(result.data.create);
    } catch (error) {
      console.log(error);
      res.status(500).json({error: {message: 'Unable to version the resource', code: 'failedMutationSummaryVersion'}});
    }
  })
  .delete(async (req, res) => {
    try {
      // Soft delete the entry
      await db.models.drugTarget.destroy({where: {ident: req.drugTarget.ident}});
      res.json({success: true});
    } catch (error) {
      console.log(error);
      res.status(500).json({error: {message: 'Unable to remove resource', code: 'failedOutlierRemove'}});
    }
  });

// Routing for Alteration
router.route('/drugTarget')
  .get(async (req, res) => {
    const options = {
      where: {pog_report_id: req.report.id},
      order: [['gene', 'ASC']],
    };

    try {
      // Get all rows for this POG
      const result = await db.models.drugTarget.scope('public').findAll(options);
      res.json(result);
    } catch (error) {
      console.log(error);
      res.status(500).json({error: {message: 'Unable to retrieve resource', code: 'failedOutlierlookup'}});
    }
  });

/** Protein Expression * */


router.param('protein', async (req, res, next, oIdent) => {
  try {
    const result = await db.models.outlier.scope('public').findOne({where: {ident: oIdent, expType: 'protein'}});
    if (result === null) return res.status(404).json({error: {message: 'Unable to locate the requested resource.', code: 'failedMiddlewareProteinLookup'}});
    req.outlier = result;
    return next();
  } catch (error) {
    console.log(error);
    return res.status(500).json({error: {message: 'Unable to process the request.', code: 'failedMiddlewareProteinQuery'}});
  }
});

// Handle requests for outliers
router.route('/protein/:protein([A-z0-9-]{36})')
  .get((req, res) => {
    res.json(req.protein);
  })
  .put(async (req, res) => {
    try {
      // Update DB Version for Entry
      const result = await versionDatum(db.models.outlier, req.outlier, req.body, req.user);
      res.json(result.data.create);
    } catch (error) {
      console.log(error);
      res.status(500).json({error: {message: 'Unable to version the resource', code: 'failedProteinVersion'}});
    }
  })
  .delete(async (req, res) => {
    try {
      // Soft delete the entry
      await db.models.outlier.destroy({where: {ident: req.outlier.ident}});
      res.json({success: true});
    } catch (error) {
      console.log(error);
      res.status(500).json({error: {message: 'Unable to remove resource', code: 'failedProteinRemove'}});
    }
  });

// Routing for all Outliers
router.route('/protein/:type(clinical|nostic|biological)?')
  .get(async (req, res) => {
    // Setup where clause
    const where = {pog_report_id: req.report.id, expType: 'protein'};
    // Searching for specific type of outlier
    if (req.params.type) {
      // Are we looking for approved types?
      where.proteinType = req.params.type;
    }
    const options = {
      where,
    };

    try {
      // Get all rows for this POG
      const result = await db.models.outlier.scope('public').findAll(options);
      res.json(result);
    } catch (error) {
      console.log(error);
      res.status(500).json({error: {message: 'Unable to retrieve resource', code: 'failedProteinlookup'}});
    }
  });


module.exports = router;
