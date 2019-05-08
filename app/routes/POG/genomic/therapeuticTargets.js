'use strict';

// app/routes/genomic/somaticMutation.js
const express = require('express');

const router = express.Router({mergeParams: true});
const db = require(`${process.cwd()}/app/models`);
const versionDatum = require(`${process.cwd()}/app/libs/VersionDatum`);

router.param('target', async (req, res, next, target) => {
  try {
    const result = await db.models.therapeuticTarget.scope('public').findOne({where: {ident: target}});
    if (result == null) return res.status(404).json({error: {message: 'Unable to locate the requested resource.', code: 'failedMiddlewareTherapeuticTargetLookup'}});
    req.target = result;
    return next();
  } catch (error) {
    return res.status(500).json({error: {message: 'Unable to process the request.', code: 'failedMiddlewareTherapeuticTargetQuery'}});
  }
});

// Handle requests for alterations
router.route('/:target([A-z0-9-]{36})')
  .get((req, res) => {
    res.json(req.target);
  })
  .put(async (req, res) => {
    req.body.ident = req.target.ident;

    try {
      // Update DB Version for Entry
      const result = await versionDatum(db.models.therapeuticTarget, req.target, req.body, req.user, req.body.comment);
      res.json(result.data.create);
    } catch (error) {
      console.log(error);
      res.status(500).json({error: {message: 'Unable to version the resource', code: 'failedTherapeuticTargetVersion'}});
    }
  })
  .delete(async (req, res) => {
    try {
      // Soft delete the entry
      // Update result
      await db.models.therapeuticTarget.destroy({where: {ident: req.target.ident}});
      db.models.POGDataHistory.create({
        pog_id: req.POG.id,
        type: 'remove',
        table: db.models.therapeuticTarget.getTableName(),
        model: db.models.therapeuticTarget.name,
        entry: req.target.ident,
        previous: req.target.dataVersion,
        user_id: req.user.id,
        comment: req.body.comment,
      });

      res.json({success: true});
    } catch (error) {
      res.status(500).json({error: {message: 'Unable to remove resource', code: 'failedTherapeuticTargetRemove'}});
    }
  });

// Routing for Alteration
router.route('/')
  .get(async (req, res) => {
    // Setup where clause
    const where = {pog_report_id: req.report.id};
    const options = {
      where,
      order: [['rank', 'ASC']],
    };

    try {
      // Get all rows for this POG
      const result = await db.models.therapeuticTarget.scope('public').findAll(options);
      res.json(result);
    } catch (error) {
      console.log(error);
      res.status(500).json({error: {message: 'Unable to retrieve resource', code: 'failedTherapeuticTargetlookup'}});
    }
  })
  .post(async (req, res) => {
    // Create new entry
    req.body.pog_id = req.POG.id;
    req.body.pog_report_id = req.report.id;

    try {
      const result = await db.models.therapeuticTarget.create(req.body);
      res.json(result);

      // Create DataHistory entry
      const dh = {
        type: 'create',
        pog_id: result.pog_id,
        table: db.models.therapeuticTarget.tableName,
        model: db.models.therapeuticTarget.name,
        entry: result.ident,
        previous: null,
        new: 0,
        user_id: req.user.id,
        comment: req.body.comment,
      };
      db.models.pog_analysis_reports_history.create(dh);
    } catch (error) {
      console.log('Unable to create entry', error);
      res.status(500).json({error: {message: 'Unable to create new therapeutic target entry', code: 'failedTherapeuticTargetCreate'}});
    }
  });

module.exports = router;
