'use strict';

// app/routes/genomic/somaticMutation.js
const express = require('express');

const router = express.Router({mergeParams: true});
const db = require(`${process.cwd()}/app/models`);
const versionDatum = require(`${process.cwd()}/app/libs/VersionDatum`);

router.param('target', (req, res, next, target) => {
  db.models.therapeuticTarget.scope('public').findOne({where: {ident: target}}).then(
    (result) => {
      if (result == null) return res.status(404).json({error: {message: 'Unable to locate the requested resource.', code: 'failedMiddlewareTherapeuticTargetLookup'}});
      req.target = result;
      next();
    },
    (error) => {
      return res.status(500).json({error: {message: 'Unable to process the request.', code: 'failedMiddlewareTherapeuticTargetQuery'}});
    }
  );
});

// Handle requests for alterations
router.route('/:target([A-z0-9-]{36})')
  .get((req, res) => {
    res.json(req.target);
  })
  .put((req, res) => {
    req.body.ident = req.target.ident;

    // Update DB Version for Entry
    versionDatum(db.models.therapeuticTarget, req.target, req.body, req.user, req.body.comment)
      .then(
        (resp) => {
          res.json(resp.data.create);
        },
        (error) => {
          console.log(error);
          res.status(500).json({error: {message: 'Unable to version the resource', code: 'failedTherapeuticTargetVersion'}});
        }
      );
  })
  .delete((req, res) => {
    // Soft delete the entry
    // Update result
    db.models.therapeuticTarget.destroy({where: {ident: req.target.ident}}).then(
      (result) => {
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
      },
      (error) => {
        res.status(500).json({error: {message: 'Unable to remove resource', code: 'failedTherapeuticTargetRemove'}});
      }
    );
  });

// Routing for Alteration
router.route('/')
  .get((req, res) => {
    // Setup where clause
    const where = {pog_report_id: req.report.id};
    const options = {
      where: where,
      order: [['rank', 'ASC']],
    };

    // Get all rows for this POG
    db.models.therapeuticTarget.scope('public').findAll(options).then(
      (result) => {
        res.json(result);
      },
      (error) => {
        console.log(error);
        res.status(500).json({error: {message: 'Unable to retrieve resource', code: 'failedTherapeuticTargetlookup'}});
      }
    );
  })
  .post((req, res) => {
    // Create new entry
    req.body.pog_id = req.POG.id;
    req.body.pog_report_id = req.report.id;

    db.models.therapeuticTarget.create(req.body).then(
      (result) => {
        res.json(result);

        // Create DataHistory entry
        const dh = {
          type: 'create',
          pog_id: result.pog_id,
          table: db.models.therapeuticTarget.getTableName(),
          model: db.models.therapeuticTarget.name,
          entry: result.ident,
          previous: null,
          new: 0,
          user_id: req.user.id,
          comment: req.body.comment,
        };
        db.models.POGDataHistory.create(dh);
      },
      (error) => {
        console.log('Unable to create entry', error);
        res.status(500).json({error: {message: 'Unable to create new therapeutic target entry', code: 'failedTherapeuticTargetCreate'}});
      }
    );
  });

module.exports = router;
