const HTTP_STATUS = require('http-status-codes');
const express = require('express');
const moment = require('moment');

const db = require('../../models');
const logger = require('../../log');

const router = express.Router({mergeParams: true});

// Middleware for report signatures
router.use('/', async (req, res, next) => {
  try {
    // Get report signatures
    req.signatures = await db.models.signatures.findOne({
      where: {reportId: req.report.id},
      include: [
        {model: db.models.user.scope('public'), as: 'reviewerSignature'},
        {model: db.models.user.scope('public'), as: 'authorSignature'},
      ],
    });
    return next();
  } catch (error) {
    logger.error(`Unable to get signatures for report ${req.report.ident} error: ${error}`);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: `Unable to get signatures for report ${req.report.ident}`}});
  }
});

router.route('/')
  .get((req, res) => {
    if (req.signatures) {
      return res.json(req.signatures.view('public'));
    }
    return res.json(null);
  });

router.route('/sign/:role(author|reviewer)')
  .put(async (req, res) => {
    // Get the role
    const {params: {role}} = req;

    // add author or reviewer
    const data = {};
    data[`${role}Id`] = req.user.id;
    data[`${role}SignedAt`] = moment().toISOString();

    // check if report has signatures
    if (!req.signatures) {
      // set report id
      data.reportId = req.report.id;

      try {
        await db.models.signatures.create(data);
        const newEntry = await db.models.signatures.scope('public').findOne({where: {reportId: req.report.id}});
        return res.json(newEntry);
      } catch (error) {
        logger.error(`Unable to create ${role} signature ${error}`);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: `Unable to create ${role} signature`}});
      }
    } else {
      try {
        await req.signatures.update(data);
        await req.signatures.reload();
        return res.json(req.signatures.view('public'));
      } catch (error) {
        logger.error(`Unable to update ${role} signature ${error}`);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: `Unable to update ${role} signature`}});
      }
    }
  });

router.route('/revoke/:role(author|reviewer)')
  .put(async (req, res) => {
    // Get the role
    const {params: {role}} = req;

    // check if signatures exists for report
    if (!req.signatures) {
      logger.error('No signatures found for this report');
      return res.status(HTTP_STATUS.NOT_FOUND).json({error: {message: 'No signatures found for this report'}});
    }

    // remove author or reviewer
    const data = {};
    data[`${role}Id`] = null;
    data[`${role}SignedAt`] = null;

    // update signatures
    try {
      await req.signatures.update(data);
      await req.signatures.reload();
      return res.json(req.signatures.view('public'));
    } catch (error) {
      logger.error(`Unable to revoke ${role} ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: `Unable to revoke ${role}`}});
    }
  });

module.exports = router;
