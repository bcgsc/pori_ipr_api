const HTTP_STATUS = require('http-status-codes');
const express = require('express');
const moment = require('moment');
const db = require('../../../models');
const logger = require('../../../log');

const router = express.Router({mergeParams: true});

// Middleware for Analyst Comments
router.use('/', async (req, res, next) => {
  try {
    // Get probe signature for report
    req.signature = await db.models.probe_signature.scope('public').findOne({where: {reportId: req.report.id}});
    return next();
  } catch (error) {
    logger.error(`Unable to query Analyst Comments for report ${req.report.ident} error: ${error}`);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: `Unable to lookup the analyst comments for report ${req.report.ident}`}});
  }
});

router.route('/')
  .get((req, res) => {
    return res.json(req.signature);
  });

router.route('/:role(ready|reviewer)')
  .put(async (req, res) => {
    // Get the role
    let role;
    if (req.params.role === 'ready') {
      role = 'readySigned';
    } else if (req.params.role === 'reviewer') {
      role = 'reviewerSigned';
    } else {
      logger.error('A valid signing role must be specified');
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({error: {message: 'A valid signing role must be specified.'}});
    }

    // Update Comments
    const data = {};
    data[`${role}By_id`] = req.user.id;
    data[`${role}At`] = moment().toISOString();
    data.reportId = req.report.id;

    // Is there a signature entry yet? If not, create one.
    if (!req.signature) {
      try {
        await db.models.probe_signature.create(data);
      } catch (error) {
        logger.error(`Create Signature Error ${error}`);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to create probe signature'}});
      }
    } else {
      try {
        await db.models.probe_signature.update(data, {
          where: {ident: req.signature.ident},
          individualHooks: true,
          paranoid: true,
        });
      } catch (error) {
        logger.error(`Unable to update prob signature ${error}`);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to update probe signature'}});
      }
    }

    try {
      const result = await db.models.probe_signature.scope('public').findOne({where: {reportId: req.report.id}});
      return res.json(result);
    } catch (error) {
      logger.error(`Error while trying to find updated probe signature ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Error while trying to find updated probe signature', cause: error}});
    }
  });

router.route('/revoke/:role(ready|reviewer)')
  .put(async (req, res) => {
    // Get the role
    let role;
    if (req.params.role === 'ready') {
      role = 'readySigned';
    } else if (req.params.role === 'reviewer') {
      role = 'reviewerSigned';
    }

    if (!role) {
      logger.error('A valid signing role must be specified');
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({error: {message: 'A valid signing role must be specified.'}});
    }

    // Update Comments
    const data = {};
    data[`${role}By_id`] = null;
    data[`${role}At`] = null;

    try {
      await db.models.probe_signature.update(data, {
        where: {ident: req.signature.ident},
        individualHooks: true,
        paranoid: true,
      });
    } catch (error) {
      logger.error(`Unable to update prob signature ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to update probe signature'}});
    }

    try {
      const result = await db.models.probe_signature.scope('public').findOne({where: {reportId: req.report.id}});
      return res.json(result);
    } catch (error) {
      logger.error(`Error while trying to find updated probe signature ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Error while trying to find updated probe signature', cause: error}});
    }
  });

module.exports = router;
