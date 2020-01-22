const HTTP_STATUS = require('http-status-codes');
const express = require('express');
const db = require('../models/');

// Get middleware files
const pogMiddleware = require('../middleware/pog');
const reportMiddleware = require('../middleware/analysis_report');
const authMiddleware = require('../middleware/auth');

// Get route files
const pogRoute = require('./POG');
const APIVersion = require('./version');
const userRoute = require('./user');
const groupRoute = require('./user/group');

const loadPogRoute = require('./load_pog');
const exportRoute = require('./POG/export');
const patientInformationRoute = require('./patientInformation');
const reportsRoute = require('./reports');
const swaggerSpec = require('./swagger/swaggerSpec');
const swaggerSpecJson = require('./swagger/swaggerSpecJson');
const projectRoute = require('./project');

// Get module route files
const RouterInterface = require('./routingInterface');
const GeneViewer = require('../modules/geneViewer/routing');
const Analysis = require('../modules/analysis/routing');
const GermlineReports = require('../modules/germine_small_mutation/routing');
const GermlineReportsExport = require('../modules/germine_small_mutation/routing/export.route');
const logger = require('../log');
const POG = require('./POG/base');

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
      files: ['POG.js', 'user.js', '.svn', 'user'],
      routes: ['loadPog', '.svn'],
    };

    // Add router to class
    this.router = router;

    // Add MiddleWare to routing
    this.router.param('POG', pogMiddleware);
    this.router.param('report', reportMiddleware);

    // Add Authentication coverage
    this.router.use(`(${
      [
        '/POG',
        '/POG/*',
        '/user/*',
        '/user',
        '/project',
        '/reports',
        '/analysis',
        '/analysis_reports',
        '/germline_small_mutation',
      ].join('|')})`, authMiddleware);

    // Add Single Routes
    // Setup other routes
    this.router.use('/POG', pogRoute);
    this.router.use('/version', APIVersion);

    this.router.use('/user', userRoute);
    this.router.use('/user/group', groupRoute);

    this.router.use('/POG/:POGID/load', loadPogRoute);
    this.router.use('/POG/:POG/report/:report/export', exportRoute);
    this.router.use('/POG/:POG/report/:report/patientInformation', patientInformationRoute);

    this.router.use('/reports', reportsRoute);

    this.router.use('/spec', swaggerSpec);
    this.router.use('/spec.json', swaggerSpecJson);

    // Register Get All Projects route
    this.getProjects();

    // Get Gene Viewer Routes
    const GeneViewerRoutes = new GeneViewer();
    this.router.use('/POG/:POG/report/:report/geneviewer', GeneViewerRoutes.getRouter());

    // Get Analysis Routes
    const AnalysisRoutes = new Analysis();
    this.router.use('/analysis', AnalysisRoutes.getRouter());

    // Get Germline Reports Routes
    const GermlineReportsRoutes = new GermlineReports();
    this.router.use('/germline_small_mutation', GermlineReportsRoutes.getRouter());

    // Get Export Germline Reports Routes
    const GermlineReportsExportRoutes = new GermlineReportsExport();
    this.router.use('/export/germline_small_mutation', GermlineReportsExportRoutes.getRouter());

    // Get Project Routes
    this.router.use('/project', projectRoute);

    // Auto-Build routes
    this.router.use('/POG/:POG/report/:report', POG);
    return true;
  }

  /**
 * Get list of available projects
 *
 * @returns {undefined}
 */
  getProjects() {
    this.router.get('/pogProjects', async (req, res) => {
      try {
        const results = await db.query('SELECT DISTINCT project FROM "POGs"');
        const mappedResult = results.shift().map((value) => {
          return value.project;
        });
        return res.json(mappedResult);
      } catch (error) {
        logger.error(error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({message: 'Unable to retrieve list of projects'});
      }
    });
  }
}

module.exports = Routing;
