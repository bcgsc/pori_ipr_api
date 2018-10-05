const recursive = require('recursive-readdir');
const _ = require('lodash');
const express = require('express');
const RouterInterface = require('./routingInterface');
const Tracking = require('../modules/tracking/routing');
const Notification = require('../modules/notification/routing');
const GeneViewer = require('../modules/geneViewer/routing');
const Analysis = require('../modules/analysis/routing');
const RecentReports = require('../modules/recentReports/routing');
const GermlineReports = require('../modules/germine_small_mutation/routing');
const GermlineReportsExport = require('../modules/germine_small_mutation/routing/export.route');

const SocketAuth = require(`${process.cwd()}/app/middleware/socketAuth`);
const db = require(`${process.cwd()}/app/models/`);
const pogMiddleware = require(`${process.cwd()}/app/middleware/pog`);
const reportMiddleware = require(`${process.cwd()}/app/middleware/analysis_report`);
const authMiddleware = require(`${process.cwd()}/app/middleware/auth`);

const router = express.Router({mergeParams: true});

class Routing extends RouterInterface {
    constructor(io) {
        super();

        this.io = io;
    }

    /**
   * Initialize routing
   *
   * @returns {Promise} initialized routing instance
   */
    init() {
        return new Promise((resolve, reject) => {
            this.ignored = {
                files: ['POG.js', 'session.js', 'user.js', '.svn', 'user'],
                routes: ['loadPog', '.svn'],
            };


            this.io.on('connect', (socket) => {
                const auth = new SocketAuth(socket, this.io);
                auth.challenge();

                console.log('Socket connected', socket.id);
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
            this.bindRouteFile('/session', `${__dirname}/session`);

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

            // Get Recent Reports Routes
            const RecentReportsRoutes = new RecentReports(this.io);

            this.bindRouteObject('/analysis_reports/recent/', RecentReportsRoutes.getRouter());

            // Get Recent Reports Routes
            const GermlineReportsRoutes = new GermlineReports(this.io);

            this.bindRouteObject('/germline_small_mutation', GermlineReportsRoutes.getRouter());

            // Get Recent Reports Routes
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
                    if (route.indexOf('.svn') !== -1) return; // Must SVN make so many directories?!
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
