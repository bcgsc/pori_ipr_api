const recursive = require('recursive-readdir');
const _ = require('lodash');
const express = require('express');
const RouterInterface = require('./routingInterface');
const Tracking = require('../modules/tracking/routing');
const Notification = require('../modules/notification/routing');
const GeneViewer = require('../modules/geneViewer/routing');
const Analysis = require('../modules/analysis/routing');
const GermlineReports = require('../modules/germine_small_mutation/routing');
const GermlineReportsExport = require('../modules/germine_small_mutation/routing/export.route');
const SocketAuth = require('../middleware/socketAuth');
const db = require('../models/');
const pogMiddleware = require('../middleware/pog');
const reportMiddleware = require('../middleware/analysis_report');
const authMiddleware = require('../middleware/auth');

const router = express.Router({mergeParams: true});

class Routing extends RouterInterface {
    constructor(io) {
        super();

        this.io = io;
    }

    /**
   * Initialize routing
   *
   * @returns {Promise}
   */
  init() {
    
    return new Promise((resolve, eject) => {
      this.ignored = {
        files: ['POG.js', 'user.js', '.svn', 'user'],
        routes: ['loadPog', '.svn'],
      };
  
  
      this.io.on('connect', async (socket) => {
        let auth = new SocketAuth(socket, this.io);
        try {
          await auth.challenge();
          console.log(`Socket connected ${socket.id}`);
        } catch (error) {
          console.error(`Challenge falied with this error: ${error}`);
        }
      });
      
      this.io.on('disconnect', (socket) => {
        console.log('Socket disconnected', socket.id);
      });
  
      // Add router to class
      this.router = router;
  
      // Add MiddleWare to routing
      this.router.param('POG', require(process.cwd() + '/app/middleware/pog'));  // POG Middleware injection
      this.router.param('report', require(process.cwd() + '/app/middleware/analysis_report')); // Analysis report middleware injection
  
      // Add Authentication coverage
      this.router.use('(/POG|/POG/*|/user/*|/user|/project|/jira|/knowledgebase|/tracking|/reports|/analysis|/analysis_reports|/germline_small_mutation)', require(process.cwd() + '/app/middleware/auth'));
  
      // Add Single Routes
      // Setup other routes
      this.bindRouteFile('/POG', __dirname + '/POG');
  
      this.bindRouteFile('/user', __dirname + '/user');
      this.bindRouteFile('/user/group', __dirname + '/user/group');
      this.bindRouteFile('/jira', __dirname + '/jira');
  
      this.bindRouteFile('/POG/:POG/report/:report/history', __dirname + '/dataHistory');
      this.bindRouteFile('/POG/:POG/report/:report/export', __dirname + '/POG/export');
      this.bindRouteFile('/POG/:POG/patientInformation', __dirname + '/patientInformation');
  
      this.bindRouteFile('/reports', __dirname + '/reports');
  
      this.bindRouteFile('/knowledgebase', __dirname + '/knowledgebase');
      
      // Register Get All Projects route
      this.getProjects();
  
      // Get Tracking Routes
      let tracking = require('../modules/tracking/routing');
      let TrackingRoutes = new tracking(this.io);
  
      this.bindRouteObject('/tracking', TrackingRoutes.getRouter());
  
      // Get Notification Routes
      let notification = require('../modules/notification/routing');
      let NotificationRoutes = new notification(this.io);
  
      this.bindRouteObject('/notification', NotificationRoutes.getRouter());
  
  
      // Get Notification Routes
      let GeneViewer = require('../modules/geneViewer/routing');
      let GeneViewerRoutes = new GeneViewer(this.io);
  
      this.bindRouteObject('/POG/:POG/report/:report/geneviewer', GeneViewerRoutes.getRouter());
      
      // Get Notification Routes
      let Analysis = require('../modules/analysis/routing');
      let AnalysisRoutes = new Analysis(this.io);
  
      this.bindRouteObject('/analysis', AnalysisRoutes.getRouter());
  
      // Get Germline Reports Routes
      let Germline_Reports = require('../modules/germine_small_mutation/routing');
      let GermlineReportsRoutes = new Germline_Reports(this.io);
  
      this.bindRouteObject('/germline_small_mutation', GermlineReportsRoutes.getRouter());
  
      // Get Export Germline Reports Routes
      let Germline_Reports_Export = require('../modules/germine_small_mutation/routing/export.route');
      let GermlineReportsExportRoutes = new Germline_Reports_Export(this.io);
  
      this.bindRouteObject('/export/germline_small_mutation', GermlineReportsExportRoutes.getRouter());

      // Get Project Routes
      this.bindRouteFile('/project', __dirname + '/project');
  
      // Auto-Build routes
      this.buildRecursiveRoutes().then(
        (result) => {
          resolve();
        }
      )
    });
    
  }

  /**
   * Automatically map POG endpoints
   *
   */
    init() {
        return new Promise((resolve, reject) => {
            this.ignored = {
                files: ['POG.js', 'user.js', 'user'],
                routes: ['loadPog'],
            };


            this.io.on('connect', async (socket) => {
                const auth = new SocketAuth(socket, this.io);
                try {
                    await auth.challenge();
                    console.log(`Socket connected ${socket.id}`);
                } catch (error) {
                    console.error(`Challenge failed with this error: ${error}`);
                }
            });

            this.io.on('disconnect', (socket) => {
                console.log('Socket disconnected', socket.id);
            });

            // Add router to class
            this.router = router;

            // Add MiddleWare to routing
            this.router.param('POG', pogMiddleware); // POG Middleware injection
            this.router.param('report', reportMiddleware); // Analysis report middleware injection

            // Add Authentication coverage
            this.router.use('(/POG|/POG/*|/user/*|/user|/project|/jira|/knowledgebase|/tracking|/reports|/analysis|/analysis_reports|/germline_small_mutation)', authMiddleware);

            // Add Single Routes
            // Setup other routes
            this.bindRouteFile('/POG', `${__dirname}/POG`);

            this.bindRouteFile('/user', `${__dirname}/user`);
            this.bindRouteFile('/user/group', `${__dirname}/user/group`);
            this.bindRouteFile('/jira', `${__dirname}/jira`);

            this.bindRouteFile('/POG/:POGID/load', `${__dirname}/load_pog.js`);
            this.bindRouteFile('/POG/:POG/report/:report/history', `${__dirname}/dataHistory`);
            this.bindRouteFile('/POG/:POG/report/:report/export', `${__dirname}/POG/export`);
            this.bindRouteFile('/POG/:POG/patientInformation', `${__dirname}/patientInformation`);

            this.bindRouteFile('/reports', `${__dirname}/reports`);

            this.bindRouteFile('/knowledgebase', `${__dirname}/knowledgebase`);

            // Register Get All Projects route
            this.getProjects();

            // Get Tracking Routes
            const TrackingRoutes = new Tracking(this.io);

            this.bindRouteObject('/tracking', TrackingRoutes.getRouter());

            // Get Notification Routes
            const NotificationRoutes = new Notification(this.io);

            this.bindRouteObject('/notification', NotificationRoutes.getRouter());


            // Get Notification Routes
            const GeneViewerRoutes = new GeneViewer(this.io);

            this.bindRouteObject('/POG/:POG/report/:report/geneviewer', GeneViewerRoutes.getRouter());

            // Get Notification Routes
            const AnalysisRoutes = new Analysis(this.io);

            this.bindRouteObject('/analysis', AnalysisRoutes.getRouter());

            // Get Germline Reports Routes
            const GermlineReportsRoutes = new GermlineReports(this.io);

            this.bindRouteObject('/germline_small_mutation', GermlineReportsRoutes.getRouter());

            // Get Export Germline Reports Routes
            const GermlineReportsExportRoutes = new GermlineReportsExport(this.io);

            this.bindRouteObject('/export/germline_small_mutation', GermlineReportsExportRoutes.getRouter());

            // Get Project Routes
            this.bindRouteFile('/project', `${__dirname}/project`);

            // Auto-Build routes
            this.buildRecursiveRoutes().then(
                () => {
                    resolve();
                }
            ).catch((err) => {
                reject(err);
            });
        });
    }

    /**
     * Automatically map POG endpoints
     *
     * @returns {Promise} Promise object represents if building routes was successful
     */
    buildRecursiveRoutes() {
        return new Promise((resolve, reject) => {
            // Recursively include routes
            recursive('./app/routes/POG', (err, files) => {
                files.forEach((route) => {
                    // Remove index file
                    if (route === 'app/routes/index.js') return;
                    if (route.indexOf('/user/') !== -1) return;
                    if (this.ignored.files.indexOf(_.last(route.split('/'))) !== -1) return;

                    // Remove first two directories of path
                    const formattedRoute = route.replace(/(app\/routes\/POG\/)/g, '').replace(/(.js)/g, '').split('/');

                    // Create routeName Object
                    const routeName = {
                        file: _.pullAt(formattedRoute, [formattedRoute.length - 1]),
                        path: (formattedRoute.length === 0) ? '' : `${_.join(formattedRoute, '/')}/`,
                    };

                    // Initialize the route to add its func
                    const module = require(`./POG/${routeName.path}${routeName.file}`); // causes linting error but need to be generated dynamically

                    // Add router to specified route name in the app
                    this.bindRouteObject(`/POG/:POG/report/:report/${routeName.path}${(routeName.file[0] === 'index') ? '' : routeName.file}`, module);
                });

                if (err) {
                    return reject(err);
                }

                return resolve();
            });
        });
    }

    /**
   * Get list of available projects
   * @returns {void}
   */
    getProjects() {
        this.registerEndpoint('get', '/pogProjects', (req, res) => {
            db.query('SELECT DISTINCT project FROM "POGs"').then(
                (result) => {
                    res.json(_.map(result[0], e => e.project));
                },
                (err) => {
                    res.status(500).json({message: 'Unable to retrieve list of projects'});
                    console.log(err);
                }
            );
        });
    }
}

module.exports = Routing;
