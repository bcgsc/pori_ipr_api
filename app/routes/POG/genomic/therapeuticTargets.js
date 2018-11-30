const express = require('express');
const db = require('../../../../app/models');
const reportChangeHistory = require('../../../../app/libs/reportChangeHistory');

const router = express.Router({mergeParams: true});
const {logger} = process;

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
    try {
      // specify editable fields
      const editable = ['type', 'rank', 'target', 'targetContext', 'resistance', 'biomarker', 'notes'];
      const editableErr = [];

      const updateTarget = {}; // set up object for updating fields
      const oldTarget = await db.models.therapeuticTarget.findOne({where: {ident: req.target.ident}});
      const newTarget = req.body;
      newTarget.ident = req.target.ident;
      delete newTarget.createdAt;
      delete newTarget.updatedAt;

      for (const field in newTarget) {
        if (newTarget[field]) {
          const fieldValue = newTarget[field];
          if (fieldValue !== oldTarget[field] && field !== 'comment') {
            if (!editable.includes(field)) editableErr.push(field); // check if user is editing a non-editable field
            updateTarget[field] = fieldValue;
          }
        }
      }

      if (editableErr.length > 0) return res.status(400).json({error: {message: `The following therapeutic target fields are not editable: ${editableErr.join(', ')}`}});

      // Update entry
      const update = await db.models.therapeuticTarget.update(updateTarget, {where: {ident: oldTarget.ident}, returning: true});
      const updatedTarget = update[1][0];

      // Record change history for each field updated
      for (const field in updateTarget) {
        if (updateTarget[field]) {
          // setup JSON objects to be stored in text field if necessary
          let oldTargetValue = oldTarget[field];
          let newTargetValue = updateTarget[field];
          if (typeof oldTargetValue === 'object') oldTargetValue = JSON.stringify(oldTargetValue);
          if (typeof newTargetValue === 'object') newTargetValue = JSON.stringify(newTargetValue);
          const changeHistorySuccess = await reportChangeHistory.recordUpdate(updatedTarget.ident, 'therapeuticTarget', field, oldTargetValue, newTargetValue, req.user.id, updatedTarget.pog_report_id, 'therapeutic target', req.body.comment);

          if (!changeHistorySuccess) {
            logger.error(`Failed to record report change history for updating therapeutic target with ident ${updatedTarget.ident}.`);
          }
        }
      }

      return res.json(updatedTarget);
    } catch (err) {
      const errMessage = `An error occurred while updating therapeutic target: ${err.message}`; // set up error message
      logger.error(errMessage); // log error
      return res.status(500).json({error: {message: errMessage}}); // return error to client
    }
  })
  .delete(async (req, res) => {
    try {
      const deletedContent = req.target; // get record to be deleted for change history
      // force delete therapeutic target
      await db.models.therapeuticTarget.destroy({where: {ident: req.target.ident}, force: true});

      // record change history
      const changeHistorySuccess = await reportChangeHistory.recordDelete(deletedContent.ident, 'therapeuticTarget', deletedContent, req.user.id, req.report.id, 'therapeutic target', req.body.comment);

      if (!changeHistorySuccess) logger.error(`Failed to record report change history for deleting therapeutic target with ident ${deletedContent.ident}.`);

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
    // TODO: Track change history for creating therapeutic targets
    // Create new entry
    req.body.pog_id = req.POG.id;
    req.body.pog_report_id = req.report.id;

    try {
      const therapeuticTarget = await db.models.therapeuticTarget.create(req.body);

      // track change history
      const changeHistorySuccess = await reportChangeHistory.recordCreate(therapeuticTarget.ident, 'therapeuticTarget', req.user.id, therapeuticTarget.pog_report_id, 'therapeutic target');
      if (!changeHistorySuccess) logger.error(`Failed to record report change history for updating therapeutic target with ident ${therapeuticTarget.ident}.`);

      return res.json(therapeuticTarget);
    } catch (err) {
      return res.status(500).json({error: {message: 'Unable to create new therapeutic target entry', code: 'failedTherapeuticTargetCreate'}});
    }
  });

module.exports = router;
