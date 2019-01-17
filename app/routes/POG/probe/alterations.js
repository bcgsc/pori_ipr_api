'use strict';

// app/routes/genomic/detailedGenomicAnalysis.js
const express = require('express');

const router = express.Router({mergeParams: true});
const db = require(`${process.cwd()}/app/models`);
const versionDatum = require(`${process.cwd()}/app/libs/VersionDatum`);

router.param('alteration', async (req, res, next, altIdent) => {
  try {
    const result = await db.models.alterations.scope('public').findOne({where: {ident: altIdent}});
    if (result === null) return res.status(404).json({error: {message: 'Unable to locate the requested resource.', code: 'failedMiddlewareAlterationLookup'}});

    req.alteration = result;
    return next();
  } catch (error) {
    console.log(error);
    return res.status(500).json({error: {message: 'Unable to process the request.', code: 'failedMiddlewareAlterationQuery'}});
  }
});

// Handle requests for alterations
router.route('/:alteration([A-z0-9-]{36})')
  .get((req, res) => {
    res.json(req.alteration);
  })
  .put(async (req, res) => {
    // Promoting from unknown to another state.
    if (req.alteration.alterationType === 'unknown' && req.body.alterationType !== 'unknown') {
      db.models.genomicAlterationsIdentified.scope('public').create({
        pog_report_id: req.report.id,
        geneVariant: `${req.alteration.gene} (${req.alteration.variant})`,
      });
    }

    try {
      // Update DB Version for Entry
      const result = await versionDatum(db.models.alterations, req.alteration, req.body, req.user, req.body.comment);
      res.json(result.data.create);
    } catch (error) {
      console.log(error);
      res.status(500).json({error: {message: 'Unable to version the resource', code: 'failedAPCDestroy'}});
    }
  })
  .delete(async (req, res) => {
    try {
      // Soft delete the entry
      // Update result
      await db.models.alterations.destroy({where: {ident: req.alteration.ident}});
      res.json({success: true});
    } catch (error) {
      res.status(500).json({error: {message: 'Unable to remove resource', code: 'failedAPCremove'}});
    }
  });

// Routing for Alteration
router.route('/:type(therapeutic|biological|prognostic|diagnostic|unknown|thisCancer|otherCancer)?')
  .get(async (req, res) => {
    // Setup where clause
    const where = {pog_report_id: req.report.id};
    where.reportType = 'probe';

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
      where.alterationType = {$ne: 'unknown'};
    }

    const options = {
      where,
      order: [['gene', 'ASC']],
    };

    try {
      // Get all rows for this POG
      const result = await db.models.alterations.scope('public').findAll(options);
      res.json(result);
    } catch (error) {
      console.log(error);
      res.status(500).json({error: {message: 'Unable to retrieve resource', code: 'failedAPClookup'}});
    }
  })
  .post(async (req, res) => {
    // Setup new data entry from vanilla
    req.body.dataVersion = 0;
    req.body.pog_id = req.POG.id;
    req.body.pog_report_id = req.report.id;

    try {
      // Update result
      const result = await db.models.alterations.create(req.body);

      // Send back newly created/updated result.
      res.json(result);

      // Create DataHistory entry
      const dh = {
        type: 'create',
        pog_id: result.pog_id,
        table: db.models.alterations.getTableName(),
        model: db.models.alterations.name,
        entry: result.ident,
        previous: null,
        new: 0,
        user_id: req.user.id,
        comment: req.body.comment,
      };
      db.models.POGDataHistory.create(dh);
    } catch (error) {
      console.log('SQL insert error', error);
      res.status(500).json({error: {message: 'Unable to update resource', code: 'failedAPClookup'}});
    }
  });


module.exports = router;
