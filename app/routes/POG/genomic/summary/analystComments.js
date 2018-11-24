const express = require('express');
const moment = require('moment');
const db = require('../../../../../app/models');
const versionDatum = require('../../../../../app/libs/VersionDatum');

const router = express.Router({mergeParams: true});

// Middleware for Analyst Comments
router.use('/', async (req, res, next) => {
  try {
    // Get analyst comments for this report
    const analystComments = await db.models.analystComments.scope('public').findOne({where: {pog_report_id: req.report.id}});

    if (!analystComments) throw new Error('notFoundError'); // no analyst comments found

    // analyst comments found, set request param
    req.analystComments = analystComments;
    return next();
  } catch (err) {
    // set default return status and message
    let returnStatus = 500;
    let returnMessage = err.message;

    if (err.message === 'notFoundError') { // return 404 error - analyst comments could not be found
      returnStatus = 404;
      returnMessage = 'analyst comments could not be found';
    }

    return res.status(returnStatus).json({error: {message: `An error occurred while trying to find analyst comments for patient ${req.POG.POGID}: ${returnMessage}`}});
  }
});

// Handle requests for analyst comments
router.route('/')
  .get((req, res) => res.json(req.analystComments))
  .put(async (req, res) => {
    // First Comments
    if (req.analystComments === null) {
      req.body.dataVersion = 0;
      req.body.pog_id = req.POG.id;
      req.body.pog_report_id = req.report.id;

      try {
        // Create new entry
        const analystComments = await db.models.analystComments.create(req.body);
        return res.json(analystComments);
      } catch (err) {
        return res.status(500).json({error: {message: 'Unable to version the resource', code: 'failedAnalystCommentCreate'}});
      }
    } else {
      req.analystComments.pog_id = req.POG.id;
      req.analystComments.pog_report_id = req.report.id;
      try {
        // Update DB Version for Entry
        const version = await versionDatum(db.models.analystComments, req.analystComments, req.body, req.user);
        return res.json(version);
      } catch (err) {
        return res.status(500).json({error: {message: 'Unable to version the resource', code: 'failedAnalystCommentVersion'}});
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
