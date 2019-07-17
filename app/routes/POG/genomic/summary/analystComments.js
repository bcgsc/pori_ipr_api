const express = require('express');
const moment = require('moment');

const router = express.Router({mergeParams: true});
const db = require('../../../../models');

const logger = require('../../../../../lib/log');

// Middleware for Analyst Comments
router.use('/', async (req, res, next) => {
  // Get Patient Information for this POG
  let result;
  try {
    result = await db.models.analystComments.scope('public').findOne({where: {pog_report_id: req.report.id}});
  } catch (error) {
    logger.error(`Unable to query analyst comments ${error}`);
    return res.status(500).json({error: {message: `Unable to query analyst comments for ${req.POG.POGID}`, code: 'failedAnalystCommentsQuery'}});
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
      req.body.pog_id = req.POG.id;
      req.body.pog_report_id = req.report.id;

      // Create new entry
      try {
        const result = await db.models.analystComments.create(req.body);
        return res.json(result);
      } catch (error) {
        logger.error(`Unable to create new analysis comments ${error}`);
        return res.status(500).json({error: {message: 'Unable to create new analysis comments', code: 'failedAnalystCommentCreate'}});
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
        return res.json(result);
      } catch (error) {
        logger.error(`Unable to update analysis comments ${error}`);
        return res.status(500).json({error: {message: 'Unable to update analysis comments', code: 'failedAnalystCommentVersion'}});
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
      return res.status(401).json({error: {message: 'A valid signing role must be specified', code: 'invalidCommentSignRole'}});
    }

    // Update Comments
    const data = {};
    data[`${role}By_id`] = req.user.id;
    data[`${role}At`] = moment().toISOString();

    try {
      await db.models.analystComments.update(data, {
        where: {
          ident: req.analystComments.ident,
        },
        individualHooks: true,
        paranoid: true,
      });
    } catch (error) {
      logger.error(`Unable to update analysis comments ${error}`);
      return res.status(500).json({error: {message: 'Unable to update analysis comments', code: 'failedSignCommentsQuery'}});
    }

    try {
      const result = await db.models.analystComments.scope('public').findOne({where: {ident: req.analystComments.ident}});
      return res.json(result);
    } catch (error) {
      logger.error(`Unable to get newly created analysis comments ${error}`);
      return res.status(500).json({error: {message: 'Unable to get newly created analysis comments', code: 'failedSignCommentsQuery'}});
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
      return res.status(401).json({error: {message: 'A valid signing role must be specified', code: 'invalidCommentSignRole'}});
    }

    // Update Comments
    const data = {};
    data[`${role}By_id`] = null;
    data[`${role}At`] = null;

    try {
      await db.models.analystComments.update(data, {
        where: {
          ident: req.analystComments.ident,
        },
        individualHooks: true,
        paranoid: true,
      });
    } catch (error) {
      logger.error(`Unable to update analysis comments ${error}`);
      return res.status(500).json({error: {message: 'Unable to update analysis comments', code: 'failedSignCommentsQuery'}});
    }

    try {
      const result = await db.models.analystComments.scope('public').findOne({where: {ident: req.analystComments.ident}});
      return res.json(result);
    } catch (error) {
      logger.error(`Unable to get newly created analysis comments ${error}`);
      return res.status(500).json({error: {message: 'Unable to get newly created analysis comments', code: 'failedSignCommentsQuery'}});
    }
  });

module.exports = router;
