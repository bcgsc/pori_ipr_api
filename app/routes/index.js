const express = require('express');

// Get middleware files
const reportMiddleware = require('../middleware/report');
const germlineMiddleware = require('../middleware/germlineSmallMutation/reports');
const authMiddleware = require('../middleware/auth');
const aclMiddleware = require('../middleware/acl');

// Get route files
const APIVersion = require('./version');
const userRoute = require('./user');

const reportsRoute = require('./report/report');
const reportsAsyncRoute = require('./report/reportAsync');
const swaggerSpec = require('./swagger/swaggerSpec');
const swaggerSpecJson = require('./swagger/swaggerSpecJson');
const projectRoute = require('./project');
const notificationRoute = require('./notification');
const templateRoute = require('./template');

// Get module route files
const RouterInterface = require('./routingInterface');
const germlineReports = require('./germlineSmallMutation/reports');
const germlineReportSections = require('./germlineSmallMutation');
const germlineReportsExport = require('./germlineSmallMutation/export.download');
const graphkbRouter = require('./graphkb');
const emailRouter = require('./email');
const reportSections = require('./report');

const router = express.Router({mergeParams: true});

class Routing extends RouterInterface {
  /**
   * Handles the loading of all the route files
   *
   */

  /**
   * Initialize routing
   *
   * @returns {Promise.<boolean>} - Returns true if init was successful
   */
  async init() {
    this.ignored = {
      files: ['user.js', '.svn', 'user'],
      routes: ['.svn'],
    };

    // Add router to class
    this.router = router;

    // Add MiddleWare to routing
    this.router.param('report', reportMiddleware);
    this.router.param('gsm_report', germlineMiddleware);

    // Add Authentication coverage
    // To every route except for specification routes (/spec and /spec.json)
    this.router.use(/^((?!^\/spec).)*$/i, authMiddleware);

    // Acl middleware
    // To every route except for specification and report routes
    this.router.use(/^(?!^\/spec|\/germline-small-mutation-reports(?:\/([^\\?]+?))|\/reports(?:\/([^\\?]+?))[\\?]?.*)/i, aclMiddleware);

    // Add Single Routes
    // Setup other routes
    this.router.use('/graphkb', graphkbRouter);
    this.router.use('/email', emailRouter);
    this.router.use('/version', APIVersion);

    this.router.use('/user', userRoute);

    this.router.use('/reports', reportsRoute);
    this.router.use('/reports/:report', reportSections);

    this.router.use('/reports-async', reportsAsyncRoute);

    this.router.use('/spec', swaggerSpec);
    this.router.use('/spec.json', swaggerSpecJson);

    // Get Germline Reports Routes
    this.router.use('/germline-small-mutation-reports', germlineReports);
    this.router.use('/germline-small-mutation-reports/:gsm_report', germlineReportSections);

    // Get Export Germline Reports Routes
    this.router.use('/export/germline-small-mutation-reports', germlineReportsExport);

    // Get Project Routes
    this.router.use('/project', projectRoute);

    // Get Notification Routes
    this.router.use('/notification', notificationRoute);

    // Get template routes
    this.router.use('/templates', templateRoute);

    return true;
  }
}

module.exports = Routing;
