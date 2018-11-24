const express = require('express');
const db = require('../../../../app/models');
const versionDatum = require('../../../../app/libs/VersionDatum');

const router = express.Router({mergeParams: true});

router.param('target', async (req, res, next, targetIdent) => {
  try {
    // Get therapeutic targets for this report
    const target = await db.models.therapeuticTarget.scope('public').findOne({where: {ident: targetIdent}});

    if (!target) throw new Error('notFoundError'); // no therapeutic target found

    // therapeutic target found, set request param
    req.target = target;
    return next();
  } catch (err) {
    // set default return status and message
    let returnStatus = 500;
    let returnMessage = err.message;

    if (err.message === 'notFoundError') { // return 404 error - therapeutic target could not be found
      returnStatus = 404;
      returnMessage = 'therapeutic target could not be found';
    }

    return res.status(returnStatus).json({error: {message: `An error occurred while trying to find therapeutic targets with ident ${targetIdent}: ${returnMessage}`}});
  }
});

// Handle requests for alterations
router.route('/:target([A-z0-9-]{36})')
  .get((req, res) => res.json(req.target))
  .put(async (req, res) => {
    req.body.ident = req.target.ident;

    try {
      // Update DB Version for Entry
      const version = await versionDatum(db.models.therapeuticTarget, req.target, req.body, req.user, req.body.comment);
      return res.json(version.data.create);
    } catch (err) {
      return res.status(500).json({error: {message: 'Unable to version the resource', code: 'failedTherapeuticTargetVersion'}});
    }
  })
  .delete(async (req, res) => {
    try {
      // Soft delete the entry
      // Update result
      await db.models.therapeuticTarget.destroy({where: {ident: req.target.ident}});
      await db.models.POGDataHistory.create({
        pog_id: req.POG.id,
        type: 'remove',
        table: db.models.therapeuticTarget.getTableName(),
        model: db.models.therapeuticTarget.name,
        entry: req.target.ident,
        previous: req.target.dataVersion,
        user_id: req.user.id,
        comment: req.body.comment,
      });

      return res.json({success: true});
    } catch (err) {
      return res.status(500).json({error: {message: 'Unable to remove resource', code: 'failedTherapeuticTargetRemove'}});
    }
  });

// Routing for therapeutic targets
router.route('/')
  .get(async (req, res) => {
    // Setup where clause
    const where = {pog_report_id: req.report.id};
    const options = {
      where,
      order: 'rank ASC',
    };

    try {
      const therapeuticTarget = await db.models.therapeuticTarget.scope('public').findAll(options);
      return res.json(therapeuticTarget);
    } catch (err) {
      return res.status(500).json({error: {message: 'Unable to retrieve resource', code: 'failedTherapeuticTargetlookup'}});
    }
  })
  .post(async (req, res) => {
    // Create new entry
    req.body.pog_id = req.POG.id;
    req.body.pog_report_id = req.report.id;

    try {
      const therapeuticTarget = await db.models.therapeuticTarget.create(req.body);
      // Create DataHistory entry
      const dh = {
        type: 'create',
        pog_id: therapeuticTarget.pog_id,
        table: db.models.therapeuticTarget.getTableName(),
        model: db.models.therapeuticTarget.name,
        entry: therapeuticTarget.ident,
        previous: null,
        new: 0,
        user_id: req.user.id,
        comment: req.body.comment,
      };
      await db.models.POGDataHistory.create(dh);

      return res.json(therapeuticTarget);
    } catch (err) {
      return res.status(500).json({error: {message: 'Unable to create new therapeutic target entry', code: 'failedTherapeuticTargetCreate'}});
    }
  });

module.exports = router;
