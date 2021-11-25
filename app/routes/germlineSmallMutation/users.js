const HTTP_STATUS = require('http-status-codes');
const express = require('express');

const db = require('../../models');
const logger = require('../../log');

const router = express.Router({mergeParams: true});

const schemaGenerator = require('../../schemas/schemaGenerator');
const validateAgainstSchema = require('../../libs/validateAgainstSchema');
const {GERMLINE_CREATE_BASE_URI} = require('../../constants');
const {GERMLINE_EXCLUDE} = require('../../schemas/exclude');

// Generate create schema
const createSchema = schemaGenerator(db.models.germlineReportUser, {
  baseUri: GERMLINE_CREATE_BASE_URI,
  exclude: [...GERMLINE_EXCLUDE, 'user_id', 'addedById'],
  properties: {user: {type: 'string', format: 'uuid'}},
  required: ['user'],
});


// Middleware for germline-user binding
router.param('germlineReportUser', async (req, res, next, ident) => {
  let result;
  try {
    result = await db.models.germlineReportUser.findOne({
      where: {ident, germlineReportId: req.report.id},
      include: [
        {model: db.models.user.scope('public'), as: 'user'},
      ],
    });
  } catch (error) {
    logger.error(`Error while trying to find germline report user error: ${error}`);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: {message: 'Error while trying to find germline report user'},
    });
  }

  if (!result) {
    logger.error('Unable to find germline-user binding');
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      error: {message: 'Unable to find germline-user binding'},
    });
  }

  // Add germlineReportUser to request
  req.germlineReportUser = result;
  return next();
});

// Routes for operating on a single report-user binding
router.route('/:germlineReportUser([A-z0-9-]{36})')
  .get(async (req, res) => {
    return res.json(req.germlineReportUser.view('public'));
  })
  .delete(async (req, res) => {
    try {
      await req.germlineReportUser.destroy();
      return res.status(HTTP_STATUS.NO_CONTENT).send();
    } catch (error) {
      logger.error(`Error while trying to delete germline-user binding ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Error while trying to delete germline-user binding'},
      });
    }
  });

// Routes for operating on all germline-user bindings for a report
router.route('/')
  .get((req, res) => {
    return res.json(req.report.users);
  })
  .post(async (req, res) => {
    const {body: {user, role}} = req;

    try {
      // Validate request against schema
      validateAgainstSchema(createSchema, req.body);
    } catch (error) {
      const message = `Error while validating germline-user binding create request ${error}`;
      logger.error(message);
      return res.status(HTTP_STATUS.BAD_REQUEST).json({error: {message}});
    }

    // Find user
    let bindUser;
    try {
      bindUser = await db.models.user.findOne({where: {ident: user}});
    } catch (error) {
      logger.error(`Error trying to find user to bind ${user}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Error trying to find user to bind'},
      });
    }

    if (!bindUser) {
      logger.error(`Unable to find user to bind: ${user}`);
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        error: {message: 'Unable to find user to bind'},
      });
    }

    // Check if binding exists
    let binding;
    try {
      binding = await db.models.germlineReportUser.findOne({
        where: {germlineReportId: req.report.id, user_id: bindUser.id, role},
      });
    } catch (error) {
      logger.error(`Error trying to find user binding ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Error trying to find user binding'},
      });
    }

    if (binding) {
      logger.error('User already bound to germline report');
      return res.status(HTTP_STATUS.CONFLICT).json({
        error: {message: 'User already bound to germline report'},
      });
    }

    // Create binding
    try {
      await db.models.germlineReportUser.create({
        user_id: bindUser.id,
        germlineReportId: req.report.id,
        role,
        addedById: req.user.id,
      });

      await req.report.reload();
      return res.status(HTTP_STATUS.CREATED).json(req.report.view('public'));
    } catch (error) {
      logger.error(`Error while creating germline-user binding ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Error while creating germline-user binding'},
      });
    }
  });

module.exports = router;
