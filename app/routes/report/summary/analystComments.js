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
        await db.models.analystComments.update(req.body, {
          where: {
            ident: req.analystComments.ident,
          },
          individualHooks: true,
          paranoid: true,
        });
      } catch (error) {
        logger.error(`Unable to update analysis comments ${error}`);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to update analysis comments'}});
      }

      // get updated public view of record with includes
      // TODO: This will get replaced with a save + reload
      // this should be changed in DEVSU-1049
      try {
        const updatedResult = await db.models.analystComments.scope('public').findOne({where: {ident: req.analystComments.ident}});
        return res.json(updatedResult);
      } catch (error) {
        logger.error(`Unable to get updated analysis comments ${error}`);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to get updated analysis comments'}});
      }
    }
  });

router.route('/sign/:role(author|reviewer)')
  .put(async (req, res) => {
    // Get the role
    const {params: {role}} = req;

    // add author or reviewer
    const data = {};
    data[`${role}Id`] = req.user.id;
    data[`${role}SignedAt`] = moment().toISOString();

    try {
      await db.models.analystComments.update(data, {
        where: {
          ident: req.analystComments.ident,
        },
        individualHooks: true,
        paranoid: true,
      });
    } catch (error) {
      logger.error(`Unable to add ${role} ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: `Unable to add ${role}`}});
    }

    // get updated public view of record with includes
    // TODO: This will get replaced with a save + reload
    // this should be changed in DEVSU-1049
    try {
      const updatedResult = await db.models.analystComments.scope('public').findOne({where: {ident: req.analystComments.ident}});
      return res.json(updatedResult);
    } catch (error) {
      logger.error(`Unable to get updated analysis comments ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to get updated analysis comments'}});
    }
  });

router.route('/sign/revoke/:role(author|reviewer)')
  .put(async (req, res) => {
    // Get the role
    const {params: {role}} = req;

    // remove author or reviewer
    const data = {};
    data[`${role}Id`] = null;
    data[`${role}SignedAt`] = null;

    // update analyst comment
    try {
      await db.models.analystComments.update(data, {
        where: {
          ident: req.analystComments.ident,
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
      const updatedResult = await db.models.analystComments.scope('public').findOne({where: {ident: req.analystComments.ident}});
      return res.json(updatedResult);
    } catch (error) {
      logger.error(`Unable to get updated analysis comments ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({error: {message: 'Unable to get updated analysis comments'}});
    }
  });

module.exports = router;
