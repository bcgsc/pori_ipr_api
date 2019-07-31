const express = require('express');
const moment = require('moment');
const db = require('../../../models');
const logger = require('../../../../lib/log');

const router = express.Router({mergeParams: true});

// Middleware for Analyst Comments
router.use('/', async (req, res, next) => {
  try {
    // Get Patient Information for this POG
    req.signature = await db.models.probe_signature.scope('public').findOne({where: {pog_report_id: req.report.id}});
    return next();
  } catch (error) {
    logger.error(`Unable to query Analyst Comments ${error}`);
    res.status(500).json({error: {message: `Unable to lookup the analyst comments for ${req.POG.POGID}.`, code: 'failedAnalystCommentsQuery'}});
    return res.end();
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
      return res.status(401).json({error: {message: 'A valid signing role must be specified.', code: 'invalidSignRole'}});
    }

    // Update Comments
    const data = {};
    data[`${role}By_id`] = req.user.id;
    data[`${role}At`] = moment().toISOString();

    // Is there a signature entry yet? If not, create one.
    if (!req.signature) {
      try {
        req.signature = await db.models.probe_signature.create({pog_id: req.POG.id, pog_report_id: req.report.id});
      } catch (error) {
        logger.error(`Create Signature Error ${error}`);
        return res.status(500).json({error: {message: 'Unable to create probe signature', code: 'failedCreateProbeSignature'}});
      }
    }

    try {
      const result = await db.models.probe_signature.update(data, {
        where: {ident: req.signature.ident},
        individualHooks: true,
        paranoid: true,
        returning: true,
      });

      // Get updated model data from update
      const [, [{dataValues}]] = result;

      // Remove id's and deletedAt properties from returned model
      const {
        id, pog_id, pog_report_id, deletedAt, ...publicModel
      } = dataValues;

      return res.json(publicModel);
    } catch (error) {
      logger.error(`Unable to update prob signature ${error}`);
      return res.status(500).json({error: {message: 'Unable to update probe signature', code: 'failedUpdateProbeSignature'}});
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
      return res.status(401).json({error: {message: 'A valid signing role must be specified.', code: 'invalidCommentSignRole'}});
    }

    // Update Comments
    const data = {};
    data[`${role}By_id`] = null;
    data[`${role}At`] = null;

    try {
      const result = await db.models.probe_signature.update(data, {
        where: {ident: req.signature.ident},
        individualHooks: true,
        paranoid: true,
        returning: true,
      });

      // Get updated model data from update
      const [, [{dataValues}]] = result;

      // Remove id's and deletedAt properties from returned model
      const {
        id, pog_id, pog_report_id, deletedAt, ...publicModel
      } = dataValues;

      return res.json(publicModel);
    } catch (error) {
      logger.error(`Unable to update prob signature ${error}`);
      return res.status(500).json({error: {message: 'Unable to update probe signature', code: 'failedUpdateProbeSignature'}});
    }
  });

module.exports = router;
