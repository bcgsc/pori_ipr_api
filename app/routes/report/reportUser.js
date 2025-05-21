const HTTP_STATUS = require('http-status-codes');
const express = require('express');

const db = require('../../models');
const logger = require('../../log');

const router = express.Router({mergeParams: true});

const schemaGenerator = require('../../schemas/schemaGenerator');
const validateAgainstSchema = require('../../libs/validateAgainstSchema');
const email = require('../../libs/email');
const {REPORT_CREATE_BASE_URI, NOTIFICATION_EVENT} = require('../../constants');
const {REPORT_EXCLUDE} = require('../../schemas/exclude');

// Generate create schema
const createSchema = schemaGenerator(db.models.reportUser, {
  baseUri: REPORT_CREATE_BASE_URI,
  exclude: [...REPORT_EXCLUDE, 'user_id', 'addedBy_id'],
  properties: {user: {type: 'string', format: 'uuid'}},
  required: ['user'],
});

// Middleware for report-user binding
router.param('reportUser', async (req, res, next, ident) => {
  let result;
  try {
    result = await db.models.reportUser.findOne({
      where: {ident, reportId: req.report.id},
      include: [
        {model: db.models.user.scope('public'), as: 'user'},
      ],
    });
  } catch (error) {
    logger.error(`Error while trying to find report user error: ${error}`);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      error: {message: 'Error while trying to find report user'},
    });
  }

  if (!result) {
    logger.error('Unable to find report-user binding');
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      error: {message: 'Unable to find report-user binding'},
    });
  }

  // Add reportUser to request
  req.reportUser = result;
  return next();
});

// Routes for operating on a single report-user binding
router.route('/:reportUser([A-z0-9-]{36})')
  .get(async (req, res) => {
    return res.json(req.reportUser.view('public'));
  })
  .delete(async (req, res) => {
    try {
      await req.reportUser.destroy();
      return res.status(HTTP_STATUS.NO_CONTENT).send();
    } catch (error) {
      logger.error(`Error while trying to delete report-user binding ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Error while trying to delete report-user binding'},
      });
    }
  });

// Routes for operating on all report-user bindings for a report
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
      const message = `Error while validating report-user binding create request ${error}`;
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
      binding = await db.models.reportUser.findOne({
        where: {reportId: req.report.id, user_id: bindUser.id, role},
      });
    } catch (error) {
      logger.error(`Error trying to find user binding ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Error trying to find user binding'},
      });
    }

    if (binding) {
      logger.error('User already bound to report');
      return res.status(HTTP_STATUS.CONFLICT).json({
        error: {message: 'User already bound to report'},
      });
    }

    // Create binding
    try {
      await db.models.reportUser.create({
        user_id: bindUser.id,
        reportId: req.report.id,
        role,
        addedBy_id: req.user.id,
      });

      const report = await db.models.report.findOne({where: {id: req.report.id}});
      const reportProject = await db.models.reportProject.findOne({where: {report_id: req.report.id}});
      const project = await db.models.project.findOne({where: {id: reportProject.project_id}});
      const template = await db.models.template.findOne({where: {id: report.templateId}});
      const userGroup = await db.models.userGroup.findOne({where: {name: 'admin'}});

      const notifyReq = await db.models.notification.findOrCreate({
        where: {
          userId: req.user.id,
          eventType: NOTIFICATION_EVENT.USER_BOUND,
          templateId: report.templateId,
          projectId: reportProject.project_id,
          userGroupId: userGroup.id,
        },
      });

      const notifyBinding = await db.models.notification.findOrCreate({
        where: {
          userId: bindUser.id,
          eventType: NOTIFICATION_EVENT.USER_BOUND,
          templateId: report.templateId,
          projectId: reportProject.project_id,
          userGroupId: userGroup.id,
        },
      });

      // Try sending email
      try {
        await email.notifyUsers(
          `${bindUser.firstName} ${bindUser.lastName} has been bound to a report`,
          `User ${bindUser.firstName} ${bindUser.lastName} has been bound to report ${req.report.ident} as ${role}.
          Report Type: ${template.name}
          Patient Id: ${report.patientId}
          Project: ${project.name}`,
          {
            id: [notifyReq[0].id, notifyBinding[0].id],
          },
        );
        logger.info('Email sent successfully');
      } catch (error) {
        logger.error(`Email not sent successfully: ${error}`);
      }

      await req.report.reload();
      return res.status(HTTP_STATUS.CREATED).json(req.report.view('public'));
    } catch (error) {
      logger.error(`Error while creating user-report binding ${error}`);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        error: {message: 'Error while creating user-report binding'},
      });
    }
  });

module.exports = router;
