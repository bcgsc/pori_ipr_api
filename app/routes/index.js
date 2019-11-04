const express = require('express');
const db = require('../models/');

// Get middleware files
const pogMiddleware = require('../middleware/pog');
const reportMiddleware = require('../middleware/analysis_report');
const authMiddleware = require('../middleware/auth');
const SocketAuth = require('../middleware/socketAuth');

// Get route files
const pogRoute = require('./POG');
const userRoute = require('./user');
const groupRoute = require('./user/group');
const jiraRoute = require('./jira');
const limsRoute = require('./lims');

const loadPogRoute = require('./load_pog');
const exportRoute = require('./POG/export');
const patientInformationRoute = require('./patientInformation');
const reportsRoute = require('./reports');
const knowledgebaseRoute = require('./knowledgebase');
const swaggerSpec = require('./swagger/swaggerSpec');
const swaggerSpecJson = require('./swagger/swaggerSpecJson');
const projectRoute = require('./project');

// Get module route files
const RouterInterface = require('./routingInterface');
const Tracking = require('../modules/tracking/routing');
const Notification = require('../modules/notification/routing');
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
   * @param {object} io - socket.io server
   */
  constructor(io) {
    super();
    this.io = io;
  }

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

    this.io.on('connect', async (socket) => {
      const auth = new SocketAuth(socket, this.io);
      try {
        await auth.challenge();
        logger.info(`Socket connected ${socket.id}`);
      } catch (error) {
        logger.error(`Challenge falied with this error: ${error}`);
      }
    });

    this.io.on('disconnect', (socket) => {
      logger.info(`Socket disconnected ${socket.id}`);
    });

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
        '/jira',
        '/lims',
        '/knowledgebase',
        '/tracking',
        '/reports',
        '/analysis',
        '/analysis_reports',
        '/germline_small_mutation',
      ].join('|')})`, authMiddleware);

    // Add Single Routes
    // Setup other routes
    this.router.use('/POG', pogRoute);

    this.router.use('/user', userRoute);
    this.router.use('/user/group', groupRoute);
    this.router.use('/jira', jiraRoute);
    this.router.use('/lims', limsRoute);

    this.router.use('/POG/:POGID/load', loadPogRoute);
    this.router.use('/POG/:POG/report/:report/export', exportRoute);
    this.router.use('/POG/:POG/report/:report/patientInformation', patientInformationRoute);

    this.router.use('/reports', reportsRoute);

    this.router.use('/knowledgebase', knowledgebaseRoute);

    this.router.use('/spec', swaggerSpec);
    this.router.use('/spec.json', swaggerSpecJson);

    // Register Get All Projects route
    this.getProjects();

    // Get Tracking Routes
    const TrackingRoutes = new Tracking(this.io);
    this.router.use('/tracking', TrackingRoutes.getRouter());

    // Get Notification Routes
    const NotificationRoutes = new Notification(this.io);
    this.router.use('/notification', NotificationRoutes.getRouter());


    // Get Notification Routes
    const GeneViewerRoutes = new GeneViewer(this.io);
    this.router.use('/POG/:POG/report/:report/geneviewer', GeneViewerRoutes.getRouter());

    // Get Notification Routes
    const AnalysisRoutes = new Analysis(this.io);
    this.router.use('/analysis', AnalysisRoutes.getRouter());

    // Get Germline Reports Routes
    const GermlineReportsRoutes = new GermlineReports(this.io);
    this.router.use('/germline_small_mutation', GermlineReportsRoutes.getRouter());

    // Get Export Germline Reports Routes
    const GermlineReportsExportRoutes = new GermlineReportsExport(this.io);
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
        return res.status(500).json({message: 'Unable to retrieve list of projects'});
      }
    });
  }
}

module.exports = Routing;
