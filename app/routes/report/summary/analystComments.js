const HTTP_STATUS = require('http-status-codes');
const express = require('express');
const moment = require('moment');

const router = express.Router({mergeParams: true});
const db = require('../../../models');

const logger = require('../../../log');

// Middleware for Analyst Comments
router.use('/', async (req, res, next) => {
  // Get Patient Information for report
  let result;
  try {
    result = await db.models.analystComments.scope('public').findOne({where: {reportId: req.report.id}});
  } catch (error) {
    logger.error(`Unable to query analyst comments for ${req.report.patientId} with error ${error}`);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: `Unable to query analyst comments for ${req.report.patientId}`, code: 'failedAnalystCommentsQuery'}});
  }

  // Not found is allowed!
  // Found the patient information
  req.analystComments = result;
  return next();
});

// Handle requests for alterations
router.route('/')
  .get((req, res) => {
    // Get Patient History
    return res.json(req.analystComments);
  })
  .put(async (req, res) => {
    // First Comments
    if (!req.analystComments) {
      req.body.reportId = req.report.id;

      // Create new entry
      try {
        const result = await db.models.analystComments.create(req.body);
        return res.json(result);
      } catch (error) {
        logger.error(`Unable to create new analysis comments ${error}`);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to create new analysis comments', code: 'failedAnalystCommentCreate'}});
      }
    } else {
      // Update DB Version for Entry
      try {
        const result = await db.models.analystComments.update(req.body, {
          where: {
            ident: req.analystComments.ident,
          },
          individualHooks: true,
          paranoid: true,
          returning: true,
        });

        // Get updated model data from update
        const [, [{dataValues}]] = result;

        // Remove id's and deletedAt properties from returned model
        const {
          id, reportId, deletedAt, authorSignedBy_id, reviewerSignedBy_id, ...publicModel
        } = dataValues;

        return res.json(publicModel);
      } catch (error) {
        logger.error(`Unable to update analysis comments ${error}`);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to update analysis comments', code: 'failedAnalystCommentVersion'}});
      }
    }
  });

router.route('/sign/:role(author|reviewer)')
  .put(async (req, res) => {
    // Get the role
    let role;
    if (req.params.role === 'author') {
      role = 'authorSigned';
    } else if (req.params.role === 'reviewer') {
      role = 'reviewerSigned';
    }

    if (!role) {
      logger.error('A valid signing role must be specified');
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({error: {message: 'A valid signing role must be specified', code: 'invalidCommentSignRole'}});
    }

    // Update Comments
    const data = {};
    data[`${role}By_id`] = req.user.id;
    data[`${role}At`] = moment().toISOString();

    try {
      const result = await db.models.analystComments.update(data, {
        where: {
          ident: req.analystComments.ident,
        },
        individualHooks: true,
        paranoid: true,
        returning: true,
      });

      // Get updated model data from update
      const [, [{dataValues}]] = result;

      // Remove id's and deletedAt properties from returned model
      const {
        id, reportId, deletedAt, authorSignedBy_id, reviewerSignedBy_id, ...publicModel
      } = dataValues;

      return res.json(publicModel);
    } catch (error) {
      logger.error(`Unable to update analysis comments ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to update analysis comments', code: 'failedSignCommentsQuery'}});
    }
  });

router.route('/sign/revoke/:role(author|reviewer)')
  .put(async (req, res) => {
    // Get the role
    let role;
    if (req.params.role === 'author') {
      role = 'authorSigned';
    } else if (req.params.role === 'reviewer') {
      role = 'reviewerSigned';
    }

    if (!role) {
      logger.error('A valid signing role must be specified');
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({error: {message: 'A valid signing role must be specified', code: 'invalidCommentSignRole'}});
    }

    // Update Comments
    const data = {};
    data[`${role}By_id`] = null;
    data[`${role}At`] = null;

    try {
      const result = await db.models.analystComments.update(data, {
        where: {
          ident: req.analystComments.ident,
        },
        individualHooks: true,
        paranoid: true,
        returning: true,
      });

      // Get updated model data from update
      const [, [{dataValues}]] = result;

      // Remove id's and deletedAt properties from returned model
      const {
        id, reportId, deletedAt, authorSignedBy_id, reviewerSignedBy_id, ...publicModel
      } = dataValues;

      return res.json(publicModel);
    } catch (error) {
      logger.error(`Unable to update analysis comments ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to update analysis comments', code: 'failedSignCommentsQuery'}});
    }
  });

module.exports = router;
