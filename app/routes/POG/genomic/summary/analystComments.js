const express = require('express');
const moment = require('moment');
const db = require('../../../../../app/models');
const reportChangeHistory = require('../../../../../app/libs/reportChangeHistory');

const router = express.Router({mergeParams: true});
const {logger} = process;

// Middleware for Analyst Comments
router.use('/', async (req, res, next) => {
  try {
    // Get analyst comments for this report
    const analystComments = await db.models.analystComments.findOne({where: {pog_report_id: req.report.id}});

    if (!analystComments) return next(); // don't throw error if none found

    // analyst comments found, set request param
    req.analystComments = analystComments;
    return next();
  } catch (err) {
    // set default return status and message
    const returnStatus = 500;
    const returnMessage = err.message;

    return res.status(returnStatus).json({error: {message: `An error occurred while trying to find analyst comments for patient ${req.POG.POGID}: ${returnMessage}`}});
  }
});

// Handle requests for analyst comments
router.route('/')
  .get((req, res) => res.json(req.analystComments))
  .put(async (req, res) => {
    const oldComments = req.analystComments;
    const newComments = req.body;
    newComments.pog_id = req.POG.id;
    newComments.pog_report_id = req.report.id;

    // first comment generated - create new record
    if (!oldComments) {
      try {
        // Create new entry
        const analystComments = await db.models.analystComments.create(newComments);

        // record change history
        const changeHistorySuccess = await reportChangeHistory.recordCreate(analystComments.ident, 'analystComments', req.user.id, analystComments.pog_report_id, 'analyst comments');

        if (!changeHistorySuccess) {
          logger.error(`Failed to record report change history for creating analyst comments with ident ${analystComments.ident}.`);
        }

        return res.json(analystComments);
      } catch (err) {
        const errMessage = `An error occurred while creating analyst comments: ${err.message}`; // set up error message
        logger.error(errMessage); // log error
        return res.status(500).json({error: {message: errMessage}}); // return error to client
      }
    } else {
      // specify editable fields
      const editable = ['comments'];
      const editableErr = [];
      const updateComments = {}; // set up object for updating fields
      for (const field in newComments) {
        if (newComments[field]) {
          const fieldValue = newComments[field];
          if (fieldValue !== oldComments[field] && field !== 'comment') {
            if (!editable.includes(field)) editableErr.push(field); // check if user is editing a non-editable field
            updateComments[field] = fieldValue;
          }
        }
      }

      if (editableErr.length > 0) return res.status(400).json({error: {message: `The following analyst comment fields are not editable: ${editableErr.join(', ')}`}});

      try {
        // Update entry
        const update = await db.models.analystComments.update(updateComments, {where: {ident: oldComments.ident}, returning: true});
        const updatedComment = update[1][0];

        // Record change history for each field updated
        for (const field in updateComments) {
          if (updateComments[field]) {
            const changeHistorySuccess = await reportChangeHistory.recordUpdate(updatedComment.ident, 'analystComments', field, oldComments[field], updateComments[field], req.user.id, updatedComment.pog_report_id, 'analyst comments', req.body.comment);

            if (!changeHistorySuccess) {
              logger.error(`Failed to record report change history for updating analyst comments with ident ${updatedComment.ident}.`);
            }
          }
        }

        return res.json(updatedComment);
      } catch (err) {
        const errMessage = `An error occurred while updating analyst comments: ${err.message}`; // set up error message
        logger.error(errMessage); // log error
        return res.status(500).json({error: {message: errMessage}}); // return error to client
      }
    }
  });

router.route('/sign/:role(author|reviewer)')
  .put(async (req, res) => {
    // Get the role
    let role;
    if (req.params.role === 'author') role = 'authorSigned';
    if (req.params.role === 'reviewer') role = 'reviewerSigned';

    if (!role) return res.status(401).json({error: {message: 'A valid signing role must be specified.', code: 'invalidCommentSignRole'}});

    // Update Comments
    const data = {};
    data[`${role}By_id`] = req.user.id;
    data[`${role}At`] = moment().toISOString();

    try {
      const updatedComment = await db.models.analystComments.update(data, {where: {ident: req.analystComments.ident}, options: {returning: true}});
      return res.json(updatedComment);
    } catch (err) {
      return res.status(500).json({error: {message: 'Unable to sign comments', code: 'failedSignCommentsQuery'}});
    }
  });

router.route('/sign/revoke/:role(author|reviewer)')
  .put((req, res) => {
    // Get the role
    let role;
    if (req.params.role === 'author') role = 'authorSigned';
    if (req.params.role === 'reviewer') role = 'reviewerSigned';

    if (!role) return res.status(401).json({error: {message: 'A valid signing role must be specified.', code: 'invalidCommentSignRole'}});

    // Update Comments
    const data = {};
    data[`${role}By_id`] = null;
    data[`${role}At`] = null;

    try {
      const updatedComment = db.models.analystComments.update(data, {where: {ident: req.analystComments.ident}, options: {returning: true}});
      return res.json(updatedComment);
    } catch (err) {
      return res.status(500).json({error: {message: 'Unable to sign comments', code: 'failedSignCommentsQuery'}});
    }
  });

module.exports = router;
