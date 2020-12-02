const express = require('express');

// Get middleware files
const reportMiddleware = require('../middleware/analysis_report');
const germlineMiddleware = require('../middleware/germlineSmallMutation/germline_small_mutation.middleware');
const authMiddleware = require('../middleware/auth');

// Get route files
const APIVersion = require('./version');
const userRoute = require('./user');
const groupRoute = require('./user/group');

const reportsRoute = require('./report/report');
const swaggerSpec = require('./swagger/swaggerSpec');
const swaggerSpecJson = require('./swagger/swaggerSpecJson');
const projectRoute = require('./project');

// Get module route files
const RouterInterface = require('./routingInterface');
const germlineReports = require('./germlineSmallMutation/reports');
const germlineReportSections = require('./germlineSmallMutation');
const germlineReportsExport = require('./germlineSmallMutation/export.download');
const graphkbRouter = require('./graphkb');
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
    this.router.use(`(${
      [
        '/user/*',
        '/user',
        '/project',
        '/reports',
        '/germline-small-mutation-reports',
        '/export',
      ].join('|')})`, authMiddleware);

    // Add Single Routes
    // Setup other routes
    this.router.use('/graphkb', graphkbRouter);
    this.router.use('/version', APIVersion);

    this.router.use('/user', userRoute);
    this.router.use('/user/group', groupRoute);

    this.router.use('/reports', reportsRoute);
    this.router.use('/reports/:report', reportSections);

    this.router.use('/spec', swaggerSpec);
    this.router.use('/spec.json', swaggerSpecJson);

    // Get Germline Reports Routes
    this.router.use('/germline-small-mutation-reports', germlineReports);
    this.router.use('/germline-small-mutation-reports/:gsm_report', germlineReportSections);

    // Get Export Germline Reports Routes
    this.router.use('/export/germline-small-mutation-reports', germlineReportsExport);

    // Get Project Routes
    this.router.use('/project', projectRoute);

    return true;
  }
}

module.exports = Routing;
