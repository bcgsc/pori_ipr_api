const express = require('express');

// Get middleware files
const reportMiddleware = require('../middleware/analysis_report');
const authMiddleware = require('../middleware/auth');

// Get route files
const APIVersion = require('./version');
const userRoute = require('./user');
const groupRoute = require('./user/group');

const patientInformationRoute = require('./patientInformation');
const reportsRoute = require('./reports');
const swaggerSpec = require('./swagger/swaggerSpec');
const swaggerSpecJson = require('./swagger/swaggerSpecJson');
const projectRoute = require('./project');

// Get module route files
const RouterInterface = require('./routingInterface');
const GeneViewer = require('../modules/geneViewer/routing');
const GermlineReports = require('../modules/germine_small_mutation/routing');
const GermlineReportsExport = require('../modules/germine_small_mutation/routing/export.route');
const report = require('./report/base');

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

    // Add Authentication coverage
    this.router.use(`(${
      [
        '/user/*',
        '/user',
        '/project',
        '/reports',
        '/germline_small_mutation',
      ].join('|')})`, authMiddleware);

    // Add Single Routes
    // Setup other routes
    this.router.use('/version', APIVersion);

    this.router.use('/user', userRoute);
    this.router.use('/user/group', groupRoute);

    this.router.use('/reports', reportsRoute);
    this.router.use('/reports/:report/patientInformation', patientInformationRoute);

    this.router.use('/spec', swaggerSpec);
    this.router.use('/spec.json', swaggerSpecJson);

    // Get Gene Viewer Routes
    const GeneViewerRoutes = new GeneViewer();
    this.router.use('/reports/:report/geneviewer', GeneViewerRoutes.getRouter());

    // Get Germline Reports Routes
    const GermlineReportsRoutes = new GermlineReports();
    this.router.use('/germline_small_mutation', GermlineReportsRoutes.getRouter());

    // Get Export Germline Reports Routes
    const GermlineReportsExportRoutes = new GermlineReportsExport();
    this.router.use('/export/germline_small_mutation', GermlineReportsExportRoutes.getRouter());

    // Get Project Routes
    this.router.use('/project', projectRoute);

    // Auto-Build routes
    this.router.use('/reports/:report', report);
    return true;
  }
}

module.exports = Routing;
