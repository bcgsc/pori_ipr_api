const express = require('express');
const db = require('../../../../app/models');
const versionDatum = require('../../../../app/libs/VersionDatum');

const router = express.Router({mergeParams: true});

router.param('alteration', async (req, res, next, altIdent) => {
  try {
    // Look for alteration w/ matching ident
    const alteration = await db.models.alterations.scope('public').findOne({where: {ident: altIdent}});

    if (!alteration) throw new Error('notFoundError'); // no alteration found

    // alteration found, set request param
    req.alteration = alteration;
    return next();
  } catch (err) {
    // set default return status and message
    let returnStatus = 500;
    let returnMessage = err.message;

    if (err.message === 'notFoundError') { // return 404 error - alteration could not be found
      returnStatus = 404;
      returnMessage = 'alteration could not be found';
    }

    return res.status(returnStatus).json({error: {message: `An error occurred while trying to find alteration with ident ${altIdent}: ${returnMessage}`}});
  }
});

// Handle requests for alterations
router.route('/alterations/:alteration([A-z0-9-]{36})')
  .get((req, res) => res.json(req.alteration))
  .put(async (req, res) => {
    try {
      // Promoting from unknown to another state.
      if (req.alteration.alterationType === 'unknown' && req.body.alterationType !== 'unknown') {
        await db.models.genomicAlterationsIdentified.scope('public').create({
          pog_report_id: req.report.id,
          pog_id: req.POG.id,
          geneVariant: `${req.alteration.gene} (${req.alteration.variant})`,
        });
      }

      // Update DB Version for Entry
      const versionDatumResp = await versionDatum(db.models.alterations, req.alteration, req.body, req.user, req.body.comment);
      return res.json(versionDatumResp.data.create);
    } catch (err) {
      return res.status(500).json({error: {message: 'Unable to version the resource', code: 'failedAPCDestroy'}});
    }
  })
  .delete(async (req, res) => {
    try {
      // Soft delete the entry
      // Update result
      await db.models.alterations.destroy({where: {ident: req.alteration.ident}});
      return res.json({success: true});
    } catch (err) {
      return res.status(500).json({error: {message: 'Unable to remove resource', code: 'failedAPCremove'}});
    }
  });

// Routing for Alteration
router.route('/alterations/:type(therapeutic|biological|prognostic|diagnostic|unknown|novel|thisCancer|otherCancer)?')
  .get(async (req, res) => {
    // Setup where clause
    const where = {pog_report_id: req.report.id};
    where.reportType = 'genomic';

    // Searching for specific type of alterations
    if (req.params.type) {
      // Are we looking for approved types?
      if (req.params.type.indexOf('Cancer') !== -1) {
        where.approvedTherapy = req.params.type;
      } else {
        where.alterationType = req.params.type;
        where.approvedTherapy = null;
      }
    } else {
      where.approvedTherapy = null;
      where.alterationType = {$notIn: ['unknown', 'novel']};
    }

    const options = {
      where,
      order: 'gene ASC',
    };

    try {
      // Get all rows for this POG
      const alterations = await db.models.alterations.scope('public').findAll(options);
      return res.json(alterations);
    } catch (err) {
      return res.status(500).json({error: {message: 'Unable to retrieve resource', code: 'failedAPClookup'}});
    }
  })

  .post(async (req, res) => {
    // Setup new data entry from vanilla
    req.body.dataVersion = 0;
    req.body.pog_id = req.POG.id;
    req.body.pog_report_id = req.report.id;
    req.body.reportType = 'genomic';

    try {
      // Update result
      const createAlterationsResp = await db.models.alterations.create(req.body);

      // Create new entry for Key Genomic Identified
      await db.models.genomicAlterationsIdentified.scope('public').create({
        pog_report_id: req.report.id,
        pog_id: req.POG.id,
        geneVariant: `${req.body.gene} (${req.body.variant})`,
      });

      // Create DataHistory entry
      const dh = {
        type: 'create',
        pog_id: createAlterationsResp.pog_id,
        table: db.models.alterations.getTableName(),
        model: db.models.alterations.name,
        entry: createAlterationsResp.ident,
        previous: null,
        new: 0,
        user_id: req.user.id,
        comment: req.body.comment,
      };
      await db.models.POGDataHistory.create(dh);

      return res.json(createAlterationsResp);
    } catch (err) {
      return res.status(500).json({error: {message: 'Unable to update resource', code: 'failedAPClookup'}});
    }
  });

// Handle requests for alterations
router.route('/targetedGenes/:gene([A-z0-9-]{36})')
  .get((req, res) => res.json(req.alteration))
  .put(async (req, res) => {
    // Bump the version number for this entry
    req.body.dataVersion = req.alteration.dataVersion + 1;
    req.body.ident = req.alteration.ident;
    req.body.pog_id = req.POG.id;
    req.body.pog_report_id = req.report.id;

    try {
      // Update result
      const alterations = await db.models.alterations.create(req.body);
      return res.json(alterations);
    } catch (err) {
      return res.status(500).json({error: {message: 'Unable to update resource', code: 'failedTargetedGenelookup'}});
    }
  })
  .delete(async (req, res) => {
    try {
      // Soft delete the entry
      // Update result
      await db.models.alterations.destroy({where: {ident: req.alteration.ident}});
      return res.json({success: true});
    } catch (err) {
      return res.status(500).json({error: {message: 'Unable to remove resource', code: 'failedTargetedGeneremove'}});
    }
  });

// Routing for Alteration
router.route('/targetedGenes')
  .get(async (req, res) => {
    // Setup where clause
    const where = {pog_report_id: req.report.id};

    const options = {
      where,
      order: 'gene ASC',
    };

    try {
      // Get all rows for this POG
      const targetedGenes = await db.models.targetedGenes.scope('public').findAll(options);
      return res.json(targetedGenes);
    } catch (err) {
      return res.status(500).json({error: {message: 'Unable to retrieve resource', code: 'failedTargetedGenelookup'}});
    }
  });

module.exports = router;
