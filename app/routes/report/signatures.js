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
    req.signatures = await db.models.signatures.scope('public').findOne({where: {reportId: req.report.id}});
    return next();
  } catch (error) {
    logger.error(`Unable to get signatures for report ${req.report.ident} error: ${error}`);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: `Unable to get signatures for report ${req.report.ident}`}});
  }
});

router.route('/')
  .get((req, res) => {
    return res.json(req.signatures);
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
      } catch (error) {
        logger.error(`Unable to create ${role} signature ${error}`);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: `Unable to create ${role} signature`}});
      }
    } else {
      try {
        await db.models.signatures.update(data, {
          where: {
            ident: req.signatures.ident,
          },
          individualHooks: true,
          paranoid: true,
        });
      } catch (error) {
        logger.error(`Unable to update ${role} signature ${error}`);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: `Unable to update ${role} signature`}});
      }
    }

    // get updated public view of record with includes
    // TODO: This will get replaced with a save + reload
    // this should be changed in DEVSU-1049
    try {
      const updatedResult = await db.models.signatures.scope('public').findOne({where: {reportId: req.report.id}});
      return res.json(updatedResult);
    } catch (error) {
      logger.error(`Unable to get updated signatures ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to get updated signatures'}});
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
      await db.models.signatures.update(data, {
        where: {
          ident: req.signatures.ident,
        },
        individualHooks: true,
        paranoid: true,
      });
    } catch (error) {
      logger.error(`Unable to revoke ${role} ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: `Unable to revoke ${role}`}});
    }

    // get updated public view of record with includes
    // TODO: This will get replaced with a save + reload
    // this should be changed in DEVSU-1049
    try {
      const updatedResult = await db.models.signatures.scope('public').findOne({where: {ident: req.signatures.ident}});
      return res.json(updatedResult);
    } catch (error) {
      logger.error(`Unable to get updated signatures ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to get updated signatures'}});
    }
  });

module.exports = router;
